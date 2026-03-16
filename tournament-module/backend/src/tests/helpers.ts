import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function cleanDb() {
  await prisma.$transaction([
    prisma.leaderboardSnapshot.deleteMany(),
    prisma.pointsLedger.deleteMany(),
    prisma.scoringRun.deleteMany(),
    prisma.handResult.deleteMany(),
    prisma.handEvent.deleteMany(),
    prisma.messageEvent.deleteMany(),
    prisma.walletTransaction.deleteMany(),
    prisma.walletLock.deleteMany(),
    prisma.walletAccount.deleteMany(),
    prisma.seatAssignment.deleteMany(),
    prisma.tournamentRegistration.deleteMany(),
    prisma.tableSession.deleteMany(),
    prisma.tournamentTable.deleteMany(),
    prisma.systemHealth.deleteMany(),
    prisma.tournament.deleteMany(),
    prisma.event.deleteMany(),
    prisma.tableRegistry.deleteMany(),
    prisma.player.deleteMany(),
  ]);
}

export async function seedBase() {
  const event = await prisma.event.create({ data: { name: 'Test Event' } });
  const tournament = await prisma.tournament.create({
    data: {
      eventId: event.id,
      name: 'Test Tournament',
      family: 'Poker',
      variant: 'TexasHoldem',
      limitType: 'NoLimit',
      status: 'active',
      startedAt: new Date(),
    },
  });
  const table = await prisma.tableRegistry.create({
    data: { tableId: 'T1', url: 'ws://localhost:9000', displayName: 'Table 1' },
  });
  const tt = await prisma.tournamentTable.create({
    data: { tournamentId: tournament.id, tableId: table.id, isAttached: true },
  });
  const session = await prisma.tableSession.create({
    data: { tournamentTableId: tt.id, resetRequested: true },
  });

  return { event, tournament, table, tt, session };
}

export async function createPlayer(screenName: string, email?: string) {
  return prisma.player.create({
    data: {
      firstName: 'Test',
      lastName: screenName,
      email: email || `${screenName.toLowerCase()}@test.com`,
      screenName,
    },
  });
}
