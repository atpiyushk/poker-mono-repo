import { prisma, cleanDb, seedBase } from './helpers';
import { tableService } from '../services/tableService';
import { tournamentService } from '../services/tournamentService';

describe('Table Attach/Detach with Session Boundaries', () => {
  let event: any, tournament: any, table: any;

  beforeAll(async () => {
    await cleanDb();
    event = await prisma.event.create({ data: { name: 'Attach Test Event' } });
    tournament = await prisma.tournament.create({
      data: {
        eventId: event.id,
        name: 'Attach Test Tournament',
        family: 'Poker',
        variant: 'TexasHoldem',
        limitType: 'NoLimit',
        status: 'active',
        startedAt: new Date(),
      },
    });
    table = await prisma.tableRegistry.create({
      data: { tableId: 'TA1', url: 'ws://localhost:9000', displayName: 'Attach Table' },
    });
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  it('should create a session boundary on attach', async () => {
    const result = await tableService.attachTable(table.id, tournament.id);
    expect(result.tournamentTable).toBeDefined();
    expect(result.session).toBeDefined();
    expect(result.session.resetRequested).toBe(true);
    expect(result.session.endedAt).toBeNull();
  });

  it('should close session on detach', async () => {
    await tableService.detachTable(table.id, tournament.id);

    const sessions = await prisma.tableSession.findMany({
      where: { tournamentTable: { tableId: table.id, tournamentId: tournament.id } },
    });
    expect(sessions.length).toBe(1);
    expect(sessions[0].endedAt).not.toBeNull();
  });

  it('should create a new session on re-attach (old data excluded)', async () => {
    const result = await tableService.attachTable(table.id, tournament.id);
    expect(result.session).toBeDefined();

    const sessions = await prisma.tableSession.findMany({
      where: { tournamentTable: { tableId: table.id, tournamentId: tournament.id } },
      orderBy: { startedAt: 'asc' },
    });

    // Should have 2 sessions: old (closed) + new (open)
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    const oldSession = sessions[0];
    const newSession = sessions[sessions.length - 1];
    expect(oldSession.endedAt).not.toBeNull();
    expect(newSession.endedAt).toBeNull();
    expect(newSession.startedAt.getTime()).toBeGreaterThan(oldSession.startedAt.getTime());
  });

  it('should reject attaching same table twice to same tournament', async () => {
    await expect(tableService.attachTable(table.id, tournament.id)).rejects.toThrow();
  });
});
