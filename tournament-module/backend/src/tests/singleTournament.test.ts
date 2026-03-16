import { prisma, cleanDb, seedBase, createPlayer } from './helpers';
import { walletService, ConflictError } from '../services/walletService';

describe('Single Active Tournament Accrual', () => {
  let event1: any, tournament1: any, session1: any;
  let event2: any, tournament2: any, session2: any;

  beforeAll(async () => {
    await cleanDb();
    const base = await seedBase();
    event1 = base.event;
    tournament1 = base.tournament;
    session1 = base.session;

    // Create a second tournament
    event2 = await prisma.event.create({ data: { name: 'Event 2' } });
    tournament2 = await prisma.tournament.create({
      data: {
        eventId: event2.id,
        name: 'Tournament 2',
        family: 'Poker',
        variant: 'Omaha',
        limitType: 'PotLimit',
        status: 'active',
        startedAt: new Date(),
      },
    });
    const table2 = await prisma.tableRegistry.create({
      data: { tableId: 'T2', url: 'ws://localhost:9001', displayName: 'Table 2' },
    });
    const tt2 = await prisma.tournamentTable.create({
      data: { tournamentId: tournament2.id, tableId: table2.id, isAttached: true },
    });
    session2 = await prisma.tableSession.create({
      data: { tournamentTableId: tt2.id, resetRequested: true },
    });
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  it('should allow onboarding to first tournament', async () => {
    const player = await createPlayer('AccrualPlayer');
    const result = await walletService.onboardPlayer({
      playerId: player.id,
      eventId: event1.id,
      tournamentId: tournament1.id,
      tableSessionId: session1.id,
      seatNumber: 1,
      buyinAmount: 1000,
    });
    expect(result.seat).toBeDefined();
  });

  it('should reject onboarding to second tournament while accruing in first', async () => {
    const player = await prisma.player.findFirst({ where: { screenName: 'AccrualPlayer' } });

    await expect(
      walletService.onboardPlayer({
        playerId: player!.id,
        eventId: event2.id,
        tournamentId: tournament2.id,
        tableSessionId: session2.id,
        seatNumber: 1,
        buyinAmount: 500,
      })
    ).rejects.toThrow(ConflictError);
  });

  it('should allow onboarding to second tournament after detaching from first', async () => {
    const player = await prisma.player.findFirst({ where: { screenName: 'AccrualPlayer' } });
    const seat = await prisma.seatAssignment.findFirst({
      where: { playerId: player!.id, state: 'seated' },
    });

    // Detach from first
    await walletService.detachPlayer({
      seatAssignmentId: seat!.id,
      cashoutAmount: 500,
      reason: 'detached',
    });

    // Should now succeed in second tournament
    const result = await walletService.onboardPlayer({
      playerId: player!.id,
      eventId: event2.id,
      tournamentId: tournament2.id,
      tableSessionId: session2.id,
      seatNumber: 1,
      buyinAmount: 500,
    });
    expect(result.seat).toBeDefined();
  });
});
