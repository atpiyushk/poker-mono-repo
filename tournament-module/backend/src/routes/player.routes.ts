import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const playerRouter = Router();

playerRouter.use(authMiddleware);
playerRouter.use(requireRole('admin'));

// ─── List all players with search, sorting, stats ─────────────────────────

playerRouter.get('/', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '');
    const sort = String(req.query.sort || 'createdAt');
    const order = String(req.query.order || 'desc');
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    const where = q ? {
      OR: [
        { screenName: { contains: q, mode: 'insensitive' as const } },
        { firstName: { contains: q, mode: 'insensitive' as const } },
        { lastName: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {};

    const orderBy: any = {};
    if (['screenName', 'firstName', 'lastName', 'email', 'createdAt'].includes(sort)) {
      orderBy[sort] = order === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          registrations: {
            include: { tournament: { select: { id: true, name: true, status: true } } },
          },
          seatAssignments: {
            where: { state: { in: ['seated', 'sitout'] } },
            include: {
              tableSession: {
                include: {
                  tournamentTable: {
                    include: {
                      table: { select: { tableId: true, displayName: true } },
                      tournament: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
            orderBy: { seatedAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              handResults: true,
              walletAccounts: true,
              registrations: true,
            },
          },
        },
      }),
      prisma.player.count({ where }),
    ]);

    // Attach aggregated points per player
    const enriched = await Promise.all(players.map(async (p) => {
      const pointsAgg = await prisma.pointsLedger.aggregate({
        where: { playerId: p.id },
        _sum: { pointsDelta: true },
        _count: true,
      });

      const winCount = await prisma.handResult.count({
        where: { playerId: p.id, isWinner: true },
      });

      const currentSeat = p.seatAssignments[0] || null;
      let liveStatus: any = null;
      if (currentSeat) {
        liveStatus = {
          state: currentSeat.state,
          seatNumber: currentSeat.seatNumber,
          tableId: currentSeat.tableSession.tournamentTable.table.tableId,
          tableName: currentSeat.tableSession.tournamentTable.table.displayName,
          tournamentId: currentSeat.tableSession.tournamentTable.tournament.id,
          tournamentName: currentSeat.tableSession.tournamentTable.tournament.name,
        };
      }

      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        screenName: p.screenName,
        createdAt: p.createdAt,
        totalPoints: pointsAgg._sum.pointsDelta || 0,
        totalHands: p._count.handResults,
        totalWins: winCount,
        winRate: p._count.handResults > 0
          ? Math.round((winCount / p._count.handResults) * 1000) / 10
          : 0,
        tournamentsPlayed: p._count.registrations,
        liveStatus,
      };
    }));

    res.json({ players: enriched, total, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get player profile with full stats ───────────────────────────────────

playerRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        registrations: {
          include: {
            tournament: {
              select: { id: true, name: true, status: true, family: true, variant: true, limitType: true, startedAt: true, endedAt: true },
            },
          },
          orderBy: { registeredAt: 'desc' },
        },
        seatAssignments: {
          include: {
            tableSession: {
              include: {
                tournamentTable: {
                  include: {
                    table: { select: { tableId: true, displayName: true } },
                    tournament: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
          orderBy: { seatedAt: 'desc' },
        },
        walletAccounts: {
          include: {
            lock: true,
            transactions: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    if (!player) { res.status(404).json({ error: 'Player not found' }); return; }

    // Aggregate stats
    const [pointsAgg, handCount, winCount, biggestWin, biggestLoss] = await Promise.all([
      prisma.pointsLedger.aggregate({
        where: { playerId: id },
        _sum: { pointsDelta: true },
        _count: true,
      }),
      prisma.handResult.count({ where: { playerId: id } }),
      prisma.handResult.count({ where: { playerId: id, isWinner: true } }),
      prisma.handResult.findFirst({ where: { playerId: id }, orderBy: { netChips: 'desc' }, select: { netChips: true, handId: true, winningHand: true } }),
      prisma.handResult.findFirst({ where: { playerId: id }, orderBy: { netChips: 'asc' }, select: { netChips: true, handId: true } }),
    ]);

    // Per-tournament stats
    const tournamentStats = await Promise.all(
      player.registrations.map(async (reg) => {
        const tPoints = await prisma.pointsLedger.aggregate({
          where: { playerId: id, tournamentId: reg.tournament.id },
          _sum: { pointsDelta: true },
          _count: true,
        });
        const tWins = await prisma.handResult.count({
          where: {
            playerId: id,
            isWinner: true,
            tableSession: {
              tournamentTable: { tournamentId: reg.tournament.id },
            },
          },
        });
        const tHands = await prisma.handResult.count({
          where: {
            playerId: id,
            tableSession: {
              tournamentTable: { tournamentId: reg.tournament.id },
            },
          },
        });

        // Leaderboard rank for this tournament
        const snapshot = await prisma.leaderboardSnapshot.findFirst({
          where: { tournamentId: reg.tournament.id, playerId: id },
          orderBy: { snapshotAt: 'desc' },
        });

        return {
          tournament: reg.tournament,
          registeredAt: reg.registeredAt,
          activeAccrual: reg.activeAccrual,
          totalPoints: tPoints._sum.pointsDelta || 0,
          handsPlayed: tHands,
          wins: tWins,
          rank: snapshot?.rank || null,
        };
      })
    );

    // Current live status
    const activeSeat = player.seatAssignments.find(sa => sa.state === 'seated' || sa.state === 'sitout');
    let liveStatus: any = null;
    if (activeSeat) {
      liveStatus = {
        state: activeSeat.state,
        seatNumber: activeSeat.seatNumber,
        seatedAt: activeSeat.seatedAt,
        tableId: activeSeat.tableSession.tournamentTable.table.tableId,
        tableName: activeSeat.tableSession.tournamentTable.table.displayName,
        tournamentId: activeSeat.tableSession.tournamentTable.tournament.id,
        tournamentName: activeSeat.tableSession.tournamentTable.tournament.name,
      };
    }

    // Total wallet value
    const totalBalance = player.walletAccounts.reduce((sum, w) => sum + w.balance, 0);
    const totalBuyins = player.walletAccounts.reduce((sum, w) =>
      sum + w.transactions.filter(t => t.type === 'buyin' || t.type === 'rebuy').reduce((s, t) => s + t.amount, 0), 0);
    const totalCashouts = player.walletAccounts.reduce((sum, w) =>
      sum + w.transactions.filter(t => t.type === 'cashout' || t.type === 'surrender').reduce((s, t) => s + t.amount, 0), 0);

    res.json({
      ...player,
      stats: {
        totalPoints: pointsAgg._sum.pointsDelta || 0,
        totalHands: handCount,
        totalWins: winCount,
        winRate: handCount > 0 ? Math.round((winCount / handCount) * 1000) / 10 : 0,
        biggestWin: biggestWin || null,
        biggestLoss: biggestLoss || null,
        totalBalance,
        totalBuyins,
        totalCashouts,
        netProfit: totalCashouts - totalBuyins,
      },
      tournamentStats,
      liveStatus,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Update player ────────────────────────────────────────────────────────

playerRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { firstName, lastName, email, phone, screenName } = req.body;

    const existing = await prisma.player.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Player not found' }); return; }

    // Validate screen name uniqueness if changed
    if (screenName && screenName !== existing.screenName) {
      const taken = await prisma.player.findFirst({
        where: { screenName: { equals: screenName, mode: 'insensitive' }, id: { not: id } },
      });
      if (taken) { res.status(409).json({ error: 'Screen name is already taken' }); return; }
    }

    // Validate email uniqueness if changed
    if (email && email !== existing.email) {
      const taken = await prisma.player.findUnique({ where: { email } });
      if (taken && taken.id !== id) { res.status(409).json({ error: 'Email is already in use' }); return; }
    }

    const updated = await prisma.player.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(screenName !== undefined && { screenName }),
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Hand history for a player ────────────────────────────────────────────

playerRouter.get('/:id/hands', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const tournamentId = req.query.tournamentId ? Number(req.query.tournamentId) : undefined;

    const where: any = { playerId: id };
    if (tournamentId) {
      where.tableSession = { tournamentTable: { tournamentId } };
    }

    const [hands, total] = await Promise.all([
      prisma.handResult.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          tableSession: {
            include: {
              tournamentTable: {
                include: {
                  table: { select: { tableId: true, displayName: true } },
                  tournament: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.handResult.count({ where }),
    ]);

    const enriched = hands.map(h => ({
      id: h.id,
      handId: h.handId,
      netChips: h.netChips,
      totalBet: h.totalBet,
      winAmount: h.winAmount,
      winningHand: h.winningHand,
      isWinner: h.isWinner,
      seatId: h.seatId,
      createdAt: h.createdAt,
      tableName: h.tableSession.tournamentTable.table.displayName,
      tableId: h.tableSession.tournamentTable.table.tableId,
      tournamentName: h.tableSession.tournamentTable.tournament.name,
      tournamentId: h.tableSession.tournamentTable.tournament.id,
    }));

    res.json({ hands: enriched, total, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Wallet history for a player ──────────────────────────────────────────

playerRouter.get('/:id/wallet', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const wallets = await prisma.walletAccount.findMany({
      where: { playerId: id },
      include: {
        lock: true,
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });

    res.json(wallets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Points history for a player ──────────────────────────────────────────

playerRouter.get('/:id/points', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const [points, total] = await Promise.all([
      prisma.pointsLedger.findMany({
        where: { playerId: id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          tournament: { select: { id: true, name: true } },
        },
      }),
      prisma.pointsLedger.count({ where: { playerId: id } }),
    ]);

    res.json({ points, total, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Delete player ────────────────────────────────────────────────────────

playerRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const force = req.query.force === 'true';

    const activeSeat = await prisma.seatAssignment.findFirst({
      where: { playerId: id, state: { in: ['seated', 'sitout'] } },
    });

    if (activeSeat && !force) {
      res.status(400).json({ error: 'Player is currently seated. Use force=true to delete anyway.' });
      return;
    }

    // Cascade-clean related data
    await prisma.$transaction([
      prisma.leaderboardSnapshot.deleteMany({ where: { playerId: id } }),
      prisma.pointsLedger.deleteMany({ where: { playerId: id } }),
      prisma.handResult.deleteMany({ where: { playerId: id } }),
      prisma.seatAssignment.deleteMany({ where: { playerId: id } }),
      prisma.walletLock.deleteMany({ where: { walletAccount: { playerId: id } } }),
      prisma.walletTransaction.deleteMany({ where: { walletAccount: { playerId: id } } }),
      prisma.walletAccount.deleteMany({ where: { playerId: id } }),
      prisma.tournamentRegistration.deleteMany({ where: { playerId: id } }),
      prisma.player.delete({ where: { id } }),
    ]);

    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Aggregate stats (dashboard widget) ───────────────────────────────────

playerRouter.get('/stats/overview', async (_req: Request, res: Response) => {
  try {
    const [totalPlayers, activePlayers, totalHands, totalWins] = await Promise.all([
      prisma.player.count(),
      prisma.seatAssignment.findMany({
        where: { state: { in: ['seated', 'sitout'] } },
        select: { playerId: true },
        distinct: ['playerId'],
      }),
      prisma.handResult.count(),
      prisma.handResult.count({ where: { isWinner: true } }),
    ]);

    res.json({
      totalPlayers,
      activePlayers: activePlayers.length,
      totalHands,
      totalWins,
      avgWinRate: totalHands > 0 ? Math.round((totalWins / totalHands) * 1000) / 10 : 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
