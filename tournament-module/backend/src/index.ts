import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { config } from './config';
import { PrismaClient } from '@prisma/client';
import { adminRouter } from './routes/admin.routes';
import { dealerRouter } from './routes/dealer.routes';
import { registrationRouter } from './routes/registration.routes';
import { leaderboardRouter } from './routes/leaderboard.routes';
import { playerRouter } from './routes/player.routes';
import { setupLiveUpdates, LiveUpdateServer } from './ws/liveUpdates';
import { WsConnectorManager } from './services/wsConnector';
import { storeMessage, RawTableMessage } from './services/messageStore';
import { messageParser, HandEndData } from './services/messageParser';
import { scoreHand } from './services/scoringEngine';
import { getLeaderboard } from './services/leaderboardService';

export const prisma = new PrismaClient();
export const app = express();
export const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Serve frontend static files in production
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

app.use('/api/admin', adminRouter);
app.use('/api/admin/players', playerRouter);
app.use('/api/dealer', dealerRouter);
app.use('/api/register', registrationRouter);
app.use('/api/leaderboard', leaderboardRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'username and password required' });
    return;
  }
  const { generateToken } = await import('./middleware/auth');
  const token = generateToken(username, role === 'dealer' ? 'dealer' : 'admin');
  res.json({ token, role: role === 'dealer' ? 'dealer' : 'admin' });
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

export const liveUpdates: LiveUpdateServer = setupLiveUpdates(server);
export const wsManager = new WsConnectorManager();

// ─── Wire WS ingestion pipeline ───────────────────────────────────────────

wsManager.on('message', async (msg: RawTableMessage) => {
  await storeMessage(msg);

  if (msg.sessionId) {
    const events = await messageParser.parse(msg.messageType, msg.raw, msg.sessionId, msg.tableId);

    liveUpdates.broadcastTableState(msg.tableId, {
      messageType: msg.messageType,
      events,
    });
  }
});

messageParser.on('hand_ended', async (data: HandEndData) => {
  try {
    // Find which tournament this session belongs to
    const session = await prisma.tableSession.findUnique({
      where: { id: data.sessionId },
      include: { tournamentTable: { include: { tournament: true } } },
    });
    if (!session) return;

    const tournament = session.tournamentTable.tournament;
    if (tournament.status !== 'active') return;

    // Store hand results for each playing seat
    for (const seat of data.seats) {
      if (!seat.isPlaying && seat.gameStatus !== 'FOLDED') continue;

      // Find player by screen name from seat assignments
      const seatAssignment = await prisma.seatAssignment.findFirst({
        where: {
          tableSessionId: data.sessionId,
          seatNumber: seat.seatId + 1, // seats are 0-indexed from table, 1-indexed in our DB
          state: { in: ['seated', 'sitout'] },
        },
      });
      if (!seatAssignment) continue;

      const winner = data.winners.find(w => w.seatId === seat.seatId);
      const netChips = (seat.winAmount || 0) - (seat.totalBet || 0);

      await prisma.handResult.create({
        data: {
          tableSessionId: data.sessionId,
          handId: data.handId,
          playerId: seatAssignment.playerId,
          seatId: seat.seatId,
          netChips,
          totalBet: seat.totalBet || 0,
          winAmount: seat.winAmount || 0,
          winningHand: winner?.hand || null,
          isWinner: !!winner,
        },
      });
    }

    // Score and update leaderboard
    const deltas = await scoreHand(data.handId, tournament.id, data.sessionId);

    if (deltas.length > 0) {
      const leaderboard = await getLeaderboard(tournament.id);
      liveUpdates.broadcastLeaderboard(tournament.id, leaderboard);
    }
  } catch (err) {
    console.error('Error processing hand_ended:', err);
  }
});

wsManager.on('connected', (info: { tableId: string }) => {
  liveUpdates.broadcastHealth({ tableId: info.tableId, status: 'connected' });
});

wsManager.on('disconnected', (info: { tableId: string }) => {
  liveUpdates.broadcastHealth({ tableId: info.tableId, status: 'disconnected' });
});

if (require.main === module) {
  server.listen(config.port, () => {
    console.log(`Tournament Module running on port ${config.port}`);
  });
}
