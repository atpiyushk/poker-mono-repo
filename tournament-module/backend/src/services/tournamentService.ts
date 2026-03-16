import { PrismaClient, TournamentStatus, GameFamily, PokerVariant, LimitType } from '@prisma/client';

const prisma = new PrismaClient();

export class TournamentService {
  // ─── Events ──────────────────────────────────────────────────────────
  async createEvent(name: string, description?: string) {
    return prisma.event.create({ data: { name, description } });
  }

  async listEvents() {
    return prisma.event.findMany({
      include: { tournaments: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEvent(id: number) {
    return prisma.event.findUnique({
      where: { id },
      include: { tournaments: true },
    });
  }

  // ─── Tournaments ─────────────────────────────────────────────────────
  async createTournament(params: {
    eventId: number;
    name: string;
    family: GameFamily;
    variant: PokerVariant;
    limitType: LimitType;
  }) {
    return prisma.tournament.create({
      data: {
        eventId: params.eventId,
        name: params.name,
        family: params.family,
        variant: params.variant,
        limitType: params.limitType,
        status: 'draft',
      },
    });
  }

  async listTournaments(eventId?: number) {
    return prisma.tournament.findMany({
      where: eventId ? { eventId } : undefined,
      include: {
        event: { select: { id: true, name: true } },
        tournamentTables: {
          where: { isAttached: true },
          include: { table: true },
        },
        _count: { select: { registrations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTournament(id: number) {
    return prisma.tournament.findUnique({
      where: { id },
      include: {
        event: true,
        tournamentTables: { include: { table: true, sessions: true } },
        registrations: { include: { player: true } },
        _count: { select: { registrations: true, pointsLedger: true } },
      },
    });
  }

  async updateTournament(id: number, data: { name?: string; endedAt?: Date | null }) {
    const tournament = await prisma.tournament.findUniqueOrThrow({ where: { id } });

    // Only allow safe fields when active
    if (tournament.status === 'active') {
      return prisma.tournament.update({
        where: { id },
        data: { name: data.name, endedAt: data.endedAt },
      });
    }

    return prisma.tournament.update({ where: { id }, data });
  }

  async deleteTournament(id: number, force = false) {
    const tournament = await prisma.tournament.findUniqueOrThrow({ where: { id } });

    if (tournament.status === 'active' && !force) {
      throw new Error('Cannot delete a running tournament without force flag');
    }

    // Cascade: remove registrations, points, etc. — Prisma handles with onDelete if set,
    // otherwise we need to clean up manually
    await prisma.$transaction([
      prisma.pointsLedger.deleteMany({ where: { tournamentId: id } }),
      prisma.scoringRun.deleteMany({ where: { tournamentId: id } }),
      prisma.leaderboardSnapshot.deleteMany({ where: { tournamentId: id } }),
      prisma.tournamentRegistration.deleteMany({ where: { tournamentId: id } }),
      prisma.tournamentTable.deleteMany({ where: { tournamentId: id } }),
      prisma.tournament.delete({ where: { id } }),
    ]);

    return { deleted: true };
  }

  async startTournament(id: number) {
    return prisma.tournament.update({
      where: { id },
      data: { status: 'active', startedAt: new Date() },
    });
  }

  async pauseTournament(id: number) {
    return prisma.tournament.update({
      where: { id },
      data: { status: 'paused' },
    });
  }

  async completeTournament(id: number) {
    return prisma.tournament.update({
      where: { id },
      data: { status: 'completed', endedAt: new Date() },
    });
  }

  async getActiveTournaments() {
    return prisma.tournament.findMany({
      where: { status: 'active' },
      include: {
        event: { select: { id: true, name: true } },
        _count: { select: { registrations: true } },
      },
    });
  }
}

export const tournamentService = new TournamentService();
