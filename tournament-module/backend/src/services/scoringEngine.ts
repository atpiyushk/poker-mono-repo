import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

export interface PointsDelta {
  playerId: number;
  pointsDelta: number;
}

export interface ScoringPlugin {
  version: string;
  compute(handResults: HandResultInput[]): PointsDelta[];
}

interface HandResultInput {
  playerId: number;
  netChips: number;
  isWinner: boolean;
  totalBet: number;
  winAmount: number;
}

/**
 * Default scoring: points = net chips won this hand.
 * Plug in a different implementation by replacing this object.
 */
const defaultPlugin: ScoringPlugin = {
  version: 'v1',
  compute(results: HandResultInput[]): PointsDelta[] {
    return results.map(r => ({
      playerId: r.playerId,
      pointsDelta: r.netChips,
    }));
  },
};

let activePlugin: ScoringPlugin = defaultPlugin;

export function setPlugin(plugin: ScoringPlugin): void {
  activePlugin = plugin;
}

export async function scoreHand(
  handId: string,
  tournamentId: number,
  sessionId: number
): Promise<PointsDelta[]> {
  const results = await prisma.handResult.findMany({
    where: { handId, tableSessionId: sessionId },
  });

  if (results.length === 0) return [];

  const inputs: HandResultInput[] = results.map(r => ({
    playerId: r.playerId,
    netChips: r.netChips,
    isWinner: r.isWinner,
    totalBet: r.totalBet,
    winAmount: r.winAmount,
  }));

  const deltas = activePlugin.compute(inputs);

  // Persist scoring run + points ledger
  await prisma.$transaction(async (tx) => {
    await tx.scoringRun.create({
      data: { tournamentId, handId },
    });

    for (const d of deltas) {
      await tx.pointsLedger.create({
        data: {
          tournamentId,
          playerId: d.playerId,
          handId,
          pointsDelta: d.pointsDelta,
          formulaVersion: activePlugin.version,
        },
      });
    }
  });

  return deltas;
}
