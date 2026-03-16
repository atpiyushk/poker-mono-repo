import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { tournamentService } from '../services/tournamentService';
import { tableService } from '../services/tableService';
import { PrismaClient, GameFamily, PokerVariant, LimitType } from '@prisma/client';

function str(v: unknown): string { return String(v ?? ''); }

const prisma = new PrismaClient();
export const adminRouter = Router();

adminRouter.use(authMiddleware);
adminRouter.use(requireRole('admin'));

// ─── Events ────────────────────────────────────────────────────────────────

adminRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) { res.status(400).json({ error: 'name is required' }); return; }
    const event = await tournamentService.createEvent(name, description);
    res.status(201).json(event);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.get('/events', async (_req: Request, res: Response) => {
  try {
    const events = await tournamentService.listEvents();
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const event = await tournamentService.getEvent(Number(req.params.id));
    if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Tournaments ───────────────────────────────────────────────────────────

adminRouter.post('/tournaments', async (req: Request, res: Response) => {
  try {
    const { eventId, name, family, variant, limitType } = req.body;
    if (!eventId || !name || !family || !variant || !limitType) {
      res.status(400).json({ error: 'eventId, name, family, variant, limitType are required' });
      return;
    }
    const tournament = await tournamentService.createTournament({
      eventId,
      name,
      family: family as GameFamily,
      variant: variant as PokerVariant,
      limitType: limitType as LimitType,
    });
    res.status(201).json(tournament);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.get('/tournaments', async (req: Request, res: Response) => {
  try {
    const eventId = req.query.eventId ? Number(req.query.eventId) : undefined;
    const tournaments = await tournamentService.listTournaments(eventId);
    res.json(tournaments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.get('/tournaments/:id', async (req: Request, res: Response) => {
  try {
    const tournament = await tournamentService.getTournament(Number(req.params.id));
    if (!tournament) { res.status(404).json({ error: 'Tournament not found' }); return; }
    res.json(tournament);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.put('/tournaments/:id', async (req: Request, res: Response) => {
  try {
    const { name, endedAt } = req.body;
    const updated = await tournamentService.updateTournament(Number(req.params.id), {
      name,
      endedAt: endedAt ? new Date(endedAt) : undefined,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.delete('/tournaments/:id', async (req: Request, res: Response) => {
  try {
    const force = req.query.force === 'true';
    const result = await tournamentService.deleteTournament(Number(req.params.id), force);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.post('/tournaments/:id/start', async (req: Request, res: Response) => {
  try {
    const t = await tournamentService.startTournament(Number(req.params.id));
    res.json(t);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.post('/tournaments/:id/pause', async (req: Request, res: Response) => {
  try {
    const t = await tournamentService.pauseTournament(Number(req.params.id));
    res.json(t);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.post('/tournaments/:id/complete', async (req: Request, res: Response) => {
  try {
    const t = await tournamentService.completeTournament(Number(req.params.id));
    res.json(t);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Table Registry ────────────────────────────────────────────────────────

adminRouter.post('/tables', async (req: Request, res: Response) => {
  try {
    const { tableId, url, displayName } = req.body;
    if (!tableId || !url || !displayName) {
      res.status(400).json({ error: 'tableId, url, displayName are required' });
      return;
    }
    const table = await tableService.registerTable(tableId, url, displayName);
    res.status(201).json(table);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.get('/tables', async (_req: Request, res: Response) => {
  try {
    const tables = await tableService.listTables();
    res.json(tables);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.delete('/tables/:id', async (req: Request, res: Response) => {
  try {
    await tableService.deleteTable(Number(req.params.id));
    res.json({ deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Table Attach / Detach ─────────────────────────────────────────────────

adminRouter.post('/tournaments/:tid/tables/:tableId/attach', async (req: Request, res: Response) => {
  try {
    const tournamentId = Number(req.params.tid);
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

adminRouter.post('/tournaments/:tid/tables/:tableId/detach', async (req: Request, res: Response) => {
  try {
    const tournamentId = Number(req.params.tid);
    const tableIdStr = str(req.params.tableId);

    const table = await prisma.tableRegistry.findUnique({ where: { tableId: tableIdStr } });
    if (!table) { res.status(404).json({ error: 'Table not found in registry' }); return; }

    const result = await tableService.detachTable(table.id, tournamentId);

    const { wsManager } = await import('../index');
    await wsManager.disconnect(tableIdStr);

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Leaderboard ───────────────────────────────────────────────────────────

adminRouter.get('/tournaments/:id/leaderboard', async (req: Request, res: Response) => {
  try {
    const { getLeaderboard } = await import('../services/leaderboardService');
    const leaderboard = await getLeaderboard(Number(req.params.id));
    res.json(leaderboard);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── System Health ─────────────────────────────────────────────────────────

adminRouter.get('/system/health', async (_req: Request, res: Response) => {
  try {
    const health = await prisma.systemHealth.findMany({
      include: { tableRegistry: { select: { tableId: true, url: true, displayName: true } } },
    });
    res.json(health);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
