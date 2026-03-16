import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TableService {
  async registerTable(tableId: string, url: string, displayName: string) {
    return prisma.tableRegistry.create({
      data: { tableId, url, displayName },
    });
  }

  async listTables() {
    return prisma.tableRegistry.findMany({
      include: {
        systemHealth: true,
        tournamentTables: {
          where: { isAttached: true },
          include: { tournament: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTable(tableId: string) {
    return prisma.tableRegistry.findUnique({
      where: { tableId },
      include: { systemHealth: true },
    });
  }

  async deleteTable(id: number) {
    return prisma.tableRegistry.delete({ where: { id } });
  }

  /**
   * Attach a table to a tournament:
   * 1. Create tournament_tables row
   * 2. Create new table_session (reset boundary)
   * 3. Return session ID so WS connector uses it
   */
  async attachTable(tableRegistryId: number, tournamentId: number) {
    return prisma.$transaction(async (tx) => {
      // Check table is not already attached to this tournament
      const existing = await tx.tournamentTable.findFirst({
        where: { tableId: tableRegistryId, tournamentId, isAttached: true },
      });
      if (existing) {
        throw new Error('Table is already attached to this tournament');
      }

      const tt = await tx.tournamentTable.create({
        data: {
          tournamentId,
          tableId: tableRegistryId,
          isAttached: true,
        },
      });

      const session = await tx.tableSession.create({
        data: {
          tournamentTableId: tt.id,
          resetRequested: true,
        },
      });

      return { tournamentTable: tt, session };
    });
  }

  /**
   * Detach a table from a tournament:
   * 1. Close current session
   * 2. Mark tournament_table as detached
   */
  async detachTable(tableRegistryId: number, tournamentId: number) {
    return prisma.$transaction(async (tx) => {
      const tt = await tx.tournamentTable.findFirst({
        where: { tableId: tableRegistryId, tournamentId, isAttached: true },
      });
      if (!tt) throw new Error('Table is not attached to this tournament');

      // Close active sessions
      await tx.tableSession.updateMany({
        where: { tournamentTableId: tt.id, endedAt: null },
        data: { endedAt: new Date() },
      });

      await tx.tournamentTable.update({
        where: { id: tt.id },
        data: { isAttached: false, detachedAt: new Date() },
      });

      return { detached: true };
    });
  }

  async getActiveSession(tableRegistryId: number, tournamentId: number) {
    const tt = await prisma.tournamentTable.findFirst({
      where: { tableId: tableRegistryId, tournamentId, isAttached: true },
      include: {
        sessions: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });
    return tt?.sessions[0] ?? null;
  }

  async getSeats(tableSessionId: number) {
    return prisma.seatAssignment.findMany({
      where: { tableSessionId },
      include: { player: { select: { id: true, screenName: true, firstName: true, lastName: true } } },
      orderBy: { seatNumber: 'asc' },
    });
  }

  async getSeatedCount(tableSessionId: number): Promise<number> {
    return prisma.seatAssignment.count({
      where: { tableSessionId, state: 'seated' },
    });
  }
}

export const tableService = new TableService();
