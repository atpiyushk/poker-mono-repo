import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LeaderboardEntry {
  rank: number;
  playerId: number;
  screenName: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
  handsPlayed: number;
  lastDelta: number;
}

export async function getLeaderboard(tournamentId: number): Promise<LeaderboardEntry[]> {
  const rows = await prisma.pointsLedger.groupBy({
    by: ['playerId'],
    where: { tournamentId },
    _sum: { pointsDelta: true },
    _count: { handId: true },
    orderBy: { _sum: { pointsDelta: 'desc' } },
  });

  const playerIds = rows.map(r => r.playerId);
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, screenName: true, firstName: true, lastName: true },
  });
  const playerMap = new Map(players.map(p => [p.id, p]));

  // Get last delta for each player
  const lastDeltas = await Promise.all(
    playerIds.map(async (pid) => {
      const last = await prisma.pointsLedger.findFirst({
        where: { tournamentId, playerId: pid },
        orderBy: { createdAt: 'desc' },
        select: { pointsDelta: true },
      });
      return { playerId: pid, lastDelta: last?.pointsDelta ?? 0 };
    })
  );
  const deltaMap = new Map(lastDeltas.map(d => [d.playerId, d.lastDelta]));

  return rows.map((r, idx) => {
    const player = playerMap.get(r.playerId);
    return {
      rank: idx + 1,
      playerId: r.playerId,
      screenName: player?.screenName ?? 'Unknown',
      firstName: player?.firstName ?? '',
      lastName: player?.lastName ?? '',
      totalPoints: r._sum.pointsDelta ?? 0,
      handsPlayed: r._count.handId,
      lastDelta: deltaMap.get(r.playerId) ?? 0,
    };
  });
}

export async function snapshotLeaderboard(tournamentId: number): Promise<void> {
  const entries = await getLeaderboard(tournamentId);

  // Delete old snapshots for this tournament, then insert fresh
  await prisma.$transaction([
    prisma.leaderboardSnapshot.deleteMany({ where: { tournamentId } }),
    ...entries.map(e =>
      prisma.leaderboardSnapshot.create({
        data: {
          tournamentId,
          playerId: e.playerId,
          totalPoints: e.totalPoints,
          rank: e.rank,
          handsPlayed: e.handsPlayed,
        },
      })
    ),
  ]);
}
