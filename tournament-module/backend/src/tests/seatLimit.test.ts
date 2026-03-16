import { prisma, cleanDb, seedBase, createPlayer } from './helpers';
import { walletService, ConflictError } from '../services/walletService';

describe('8-Seat Limit Enforcement', () => {
  let event: any, tournament: any, session: any;
  const players: any[] = [];

  beforeAll(async () => {
    await cleanDb();
    const base = await seedBase();
    event = base.event;
    tournament = base.tournament;
    session = base.session;

    for (let i = 1; i <= 9; i++) {
      players.push(await createPlayer(`SeatPlayer${i}`, `seat${i}@test.com`));
    }
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  it('should allow seating 8 players', async () => {
    for (let i = 0; i < 8; i++) {
      const result = await walletService.onboardPlayer({
        playerId: players[i].id,
        eventId: event.id,
        tournamentId: tournament.id,
        tableSessionId: session.id,
        seatNumber: i + 1,
        buyinAmount: 100,
      });
      expect(result.seat.seatNumber).toBe(i + 1);
    }
  });

  it('should reject 9th player with all seats occupied', async () => {
    await expect(
      walletService.onboardPlayer({
        playerId: players[8].id,
        eventId: event.id,
        tournamentId: tournament.id,
        tableSessionId: session.id,
        seatNumber: 1,
        buyinAmount: 100,
      })
    ).rejects.toThrow(ConflictError);
  });
});
