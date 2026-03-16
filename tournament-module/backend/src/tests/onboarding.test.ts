import { prisma, cleanDb, seedBase, createPlayer } from './helpers';
import { walletService, ConflictError } from '../services/walletService';

describe('Onboarding Blocking Flow', () => {
  let event: any, tournament: any, session: any;

  beforeAll(async () => {
    await cleanDb();
    const base = await seedBase();
    event = base.event;
    tournament = base.tournament;
    session = base.session;
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  it('should atomically onboard a player: lock wallet + assign seat + record buyin', async () => {
    const player = await createPlayer('OnboardPlayer1');
    const result = await walletService.onboardPlayer({
      playerId: player.id,
      eventId: event.id,
      tournamentId: tournament.id,
      tableSessionId: session.id,
      seatNumber: 1,
      buyinAmount: 1000,
    });

    expect(result.seat).toBeDefined();
    expect(result.seat.seatNumber).toBe(1);
    expect(result.seat.state).toBe('seated');
    expect(result.walletTx.type).toBe('buyin');
    expect(result.walletTx.amount).toBe(1000);

    // Verify wallet is locked
    const locked = await walletService.isLocked(result.walletId);
    expect(locked).toBe(true);
  });

  it('should fail onboard if wallet is already locked elsewhere', async () => {
    const player = await createPlayer('OnboardPlayer2');

    // Onboard to seat 2
    await walletService.onboardPlayer({
      playerId: player.id,
      eventId: event.id,
      tournamentId: tournament.id,
      tableSessionId: session.id,
      seatNumber: 2,
      buyinAmount: 500,
    });

    // Try onboarding again — wallet already locked
    await expect(
      walletService.onboardPlayer({
        playerId: player.id,
        eventId: event.id,
        tournamentId: tournament.id,
        tableSessionId: session.id,
        seatNumber: 3,
        buyinAmount: 500,
      })
    ).rejects.toThrow(ConflictError);
  });

  it('should detach player: unlock wallet + update seat + record cashout', async () => {
    const player = await createPlayer('OnboardPlayer3');
    const onboard = await walletService.onboardPlayer({
      playerId: player.id,
      eventId: event.id,
      tournamentId: tournament.id,
      tableSessionId: session.id,
      seatNumber: 3,
      buyinAmount: 1000,
    });

    const result = await walletService.detachPlayer({
      seatAssignmentId: onboard.seat.id,
      cashoutAmount: 800,
      reason: 'detached',
    });

    expect(result.walletTx.type).toBe('cashout');

    // Verify wallet is unlocked
    const locked = await walletService.isLocked(onboard.walletId);
    expect(locked).toBe(false);

    // Verify seat state
    const seat = await prisma.seatAssignment.findUnique({ where: { id: onboard.seat.id } });
    expect(seat?.state).toBe('detached');
  });
});
