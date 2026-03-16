import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { walletService, ConflictError, BadRequestError } from '../services/walletService';
import { tableService } from '../services/tableService';
import { tournamentService } from '../services/tournamentService';
import { PrismaClient } from '@prisma/client';

function str(v: unknown): string { return String(v ?? ''); }

const prisma = new PrismaClient();
export const dealerRouter = Router();

dealerRouter.use(authMiddleware);
dealerRouter.use(requireRole('dealer', 'admin'));

// ─── Active tournaments for dealer to attach to ───────────────────────────

dealerRouter.get('/tournaments/active', async (_req: Request, res: Response) => {
  try {
    const tournaments = await tournamentService.getActiveTournaments();
    res.json(tournaments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Dealer attaches their table ───────────────────────────────────────────

dealerRouter.post('/table/:tableId/attach', async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.body;
    if (!tournamentId) { res.status(400).json({ error: 'tournamentId is required' }); return; }

    const tableIdStr = str(req.params.tableId);
    const table = await prisma.tableRegistry.findUnique({ where: { tableId: tableIdStr } });
    if (!table) { res.status(404).json({ error: 'Table not found in registry' }); return; }

    const result = await tableService.attachTable(table.id, tournamentId);

    const { wsManager } = await import('../index');
    await wsManager.connect(table.id, table.tableId, table.url, result.session.id);

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Search players by screen name ─────────────────────────────────────────

dealerRouter.get('/players/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '');
    if (q.length < 1) { res.json([]); return; }

    const players = await prisma.player.findMany({
      where: {
        OR: [
          { screenName: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, screenName: true, firstName: true, lastName: true },
      take: 20,
    });
    res.json(players);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Onboard player (blocking) ─────────────────────────────────────────────

dealerRouter.post('/table/:tableId/onboard', async (req: Request, res: Response) => {
  try {
    const { playerId, seatNumber, buyinAmount, tournamentId } = req.body;
    if (!playerId || !seatNumber || buyinAmount == null || !tournamentId) {
      res.status(400).json({ error: 'playerId, seatNumber, buyinAmount, tournamentId required' });
      return;
    }

    if (seatNumber < 1 || seatNumber > 8) {
      res.status(400).json({ error: 'Seat number must be between 1 and 8' });
      return;
    }

    const tableIdStr = str(req.params.tableId);
    const table = await prisma.tableRegistry.findUnique({ where: { tableId: tableIdStr } });
    if (!table) { res.status(404).json({ error: 'Table not found' }); return; }

    // Get tournament to find event
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) { res.status(404).json({ error: 'Tournament not found' }); return; }

    const session = await tableService.getActiveSession(table.id, tournamentId);
    if (!session) { res.status(400).json({ error: 'Table is not attached to this tournament' }); return; }

    const result = await walletService.onboardPlayer({
      playerId,
      eventId: tournament.eventId,
      tournamentId,
      tableSessionId: session.id,
      seatNumber,
      buyinAmount,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof ConflictError) { res.status(409).json({ error: err.message }); return; }
    if (err instanceof BadRequestError) { res.status(400).json({ error: err.message }); return; }
    res.status(500).json({ error: err.message });
  }
});

// ─── Buy-in / Rebuy ────────────────────────────────────────────────────────

dealerRouter.post('/table/:tableId/rebuy', async (req: Request, res: Response) => {
  try {
    const { playerId, amount, tournamentId } = req.body;
    if (!playerId || !amount || !tournamentId) {
      res.status(400).json({ error: 'playerId, amount, tournamentId required' });
      return;
    }

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) { res.status(404).json({ error: 'Tournament not found' }); return; }

    const wallet = await walletService.getOrCreateWallet(playerId, tournament.eventId);
    if (!wallet.lock) {
      res.status(400).json({ error: 'Player wallet is not locked (player not onboarded)' });
      return;
    }

    const result = await walletService.recordTransaction(wallet.id, 'rebuy', amount, 'Dealer rebuy');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Sit out ───────────────────────────────────────────────────────────────

dealerRouter.post('/table/:tableId/sitout/:seatId', async (req: Request, res: Response) => {
  try {
    const seatId = Number(req.params.seatId);
    await prisma.seatAssignment.update({
      where: { id: seatId },
      data: { state: 'sitout' },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Return from sit out ───────────────────────────────────────────────────

dealerRouter.post('/table/:tableId/return/:seatId', async (req: Request, res: Response) => {
  try {
    const seatId = Number(req.params.seatId);
    await prisma.seatAssignment.update({
      where: { id: seatId },
      data: { state: 'seated' },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Surrender ─────────────────────────────────────────────────────────────

dealerRouter.post('/table/:tableId/surrender/:seatId', async (req: Request, res: Response) => {
  try {
    const seatId = Number(req.params.seatId);
    const { cashoutAmount } = req.body;

    const result = await walletService.detachPlayer({
      seatAssignmentId: seatId,
      cashoutAmount: cashoutAmount || 0,
      reason: 'surrendered',
    });
    res.json(result);
  } catch (err: any) {
    if (err instanceof BadRequestError) { res.status(400).json({ error: err.message }); return; }
    res.status(500).json({ error: err.message });
  }
});

// ─── Detach player ─────────────────────────────────────────────────────────

dealerRouter.post('/table/:tableId/detach/:seatId', async (req: Request, res: Response) => {
  try {
    const seatId = Number(req.params.seatId);
    const { cashoutAmount } = req.body;

    const result = await walletService.detachPlayer({
      seatAssignmentId: seatId,
      cashoutAmount: cashoutAmount || 0,
      reason: 'detached',
    });
    res.json(result);
  } catch (err: any) {
    if (err instanceof BadRequestError) { res.status(400).json({ error: err.message }); return; }
    res.status(500).json({ error: err.message });
  }
});

// ─── Get seats for table ───────────────────────────────────────────────────

dealerRouter.get('/table/:tableId/seats', async (req: Request, res: Response) => {
  try {
    const tableIdStr = str(req.params.tableId);
    const tournamentId = Number(req.query.tournamentId);
    if (!tournamentId) { res.status(400).json({ error: 'tournamentId query param required' }); return; }

    const table = await prisma.tableRegistry.findUnique({ where: { tableId: tableIdStr } });
    if (!table) { res.status(404).json({ error: 'Table not found' }); return; }

    const session = await tableService.getActiveSession(table.id, tournamentId);
    if (!session) { res.json([]); return; }

    const seats = await tableService.getSeats(session.id);
    const seatedCount = seats.filter(s => s.state === 'seated').length;

    res.json({ seats, seatedCount, canStart: seatedCount >= 3 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
