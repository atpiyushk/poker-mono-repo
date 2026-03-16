import { prisma, cleanDb, seedBase, createPlayer } from './helpers';
import { walletService } from '../services/walletService';
import { tableService } from '../services/tableService';

describe('Minimum 3 Players Gating', () => {
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

  it('should report canStart=false with 0 players', async () => {
    const count = await tableService.getSeatedCount(session.id);
    expect(count).toBe(0);
    expect(count >= 3).toBe(false);
  });

  it('should report canStart=false with 1 player', async () => {
    const p1 = await createPlayer('MinP1', 'minp1@test.com');
    await walletService.onboardPlayer({
      playerId: p1.id,
      eventId: event.id,
      tournamentId: tournament.id,
      tableSessionId: session.id,
      seatNumber: 1,
      buyinAmount: 100,
    });
    const count = await tableService.getSeatedCount(session.id);
    expect(count).toBe(1);
    expect(count >= 3).toBe(false);
  });

  it('should report canStart=false with 2 players', async () => {
    const p2 = await createPlayer('MinP2', 'minp2@test.com');
    await walletService.onboardPlayer({
      playerId: p2.id,
      eventId: event.id,
      tournamentId: tournament.id,
      tableSessionId: session.id,
      seatNumber: 2,
      buyinAmount: 100,
    });
    const count = await tableService.getSeatedCount(session.id);
    expect(count).toBe(2);
    expect(count >= 3).toBe(false);
  });

  it('should report canStart=true with 3 players', async () => {
    const p3 = await createPlayer('MinP3', 'minp3@test.com');
    await walletService.onboardPlayer({
      playerId: p3.id,
      eventId: event.id,
      tournamentId: tournament.id,
      tableSessionId: session.id,
      seatNumber: 3,
      buyinAmount: 100,
    });
    const count = await tableService.getSeatedCount(session.id);
    expect(count).toBe(3);
    expect(count >= 3).toBe(true);
  });
});
