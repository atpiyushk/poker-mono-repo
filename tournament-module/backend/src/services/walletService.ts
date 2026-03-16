import { PrismaClient, WalletTxType } from '@prisma/client';

const prisma = new PrismaClient();

export class WalletService {
  async getOrCreateWallet(playerId: number, eventId: number) {
    return prisma.walletAccount.upsert({
      where: { playerId_eventId: { playerId, eventId } },
      update: {},
      create: { playerId, eventId, balance: 0 },
      include: { lock: true },
    });
  }

  async lockWallet(walletAccountId: number, lockedBy: string, tableSessionId?: number): Promise<void> {
    const existing = await prisma.walletLock.findUnique({ where: { walletAccountId } });
    if (existing) {
      throw new ConflictError('Wallet is already locked');
    }

    await prisma.walletLock.create({
      data: {
        walletAccountId,
        lockedBy,
        tableSessionId: tableSessionId ?? null,
      },
    });
  }

  async unlockWallet(walletAccountId: number): Promise<void> {
    const existing = await prisma.walletLock.findUnique({ where: { walletAccountId } });
    if (!existing) {
      throw new BadRequestError('Wallet is not locked');
    }

    await prisma.walletLock.delete({ where: { walletAccountId } });
  }

  async isLocked(walletAccountId: number): Promise<boolean> {
    const lock = await prisma.walletLock.findUnique({ where: { walletAccountId } });
    return lock !== null;
  }

  async recordTransaction(
    walletAccountId: number,
    type: WalletTxType,
    amount: number,
    note?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const wallet = await tx.walletAccount.findUniqueOrThrow({
        where: { id: walletAccountId },
      });

      const balanceBefore = wallet.balance;
      let balanceAfter: number;

      if (type === 'cashout' || type === 'surrender') {
        balanceAfter = balanceBefore - amount;
      } else {
        balanceAfter = balanceBefore + amount;
      }

      await tx.walletAccount.update({
        where: { id: walletAccountId },
        data: { balance: balanceAfter },
      });

      const txRecord = await tx.walletTransaction.create({
        data: {
          walletAccountId,
          type,
          amount,
          balanceBefore,
          balanceAfter,
          note,
        },
      });

      return { transaction: txRecord, balanceBefore, balanceAfter };
    });
  }

  /**
   * Atomic onboarding: lock wallet + assign seat + record buyin.
   * Returns the created seat assignment and wallet transaction.
   */
  async onboardPlayer(params: {
    playerId: number;
    eventId: number;
    tournamentId: number;
    tableSessionId: number;
    seatNumber: number;
    buyinAmount: number;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Check single active tournament accrual
      const existingAccrual = await tx.tournamentRegistration.findFirst({
        where: { playerId: params.playerId, activeAccrual: true },
      });
      if (existingAccrual && existingAccrual.tournamentId !== params.tournamentId) {
        throw new ConflictError(
          `Player is already accruing in tournament ${existingAccrual.tournamentId}`
        );
      }

      // 2. Check seat limit (8 seats max)
      const seatedCount = await tx.seatAssignment.count({
        where: { tableSessionId: params.tableSessionId, state: 'seated' },
      });
      if (seatedCount >= 8) {
        throw new ConflictError('All 8 seats are occupied');
      }

      // 3. Check seat not already taken
      const seatTaken = await tx.seatAssignment.findFirst({
        where: {
          tableSessionId: params.tableSessionId,
          seatNumber: params.seatNumber,
          state: 'seated',
        },
      });
      if (seatTaken) {
        throw new ConflictError(`Seat ${params.seatNumber} is already occupied`);
      }

      // 4. Ensure wallet exists
      const wallet = await tx.walletAccount.upsert({
        where: { playerId_eventId: { playerId: params.playerId, eventId: params.eventId } },
        update: {},
        create: { playerId: params.playerId, eventId: params.eventId, balance: 0 },
      });

      // 5. Lock wallet
      const existingLock = await tx.walletLock.findUnique({
        where: { walletAccountId: wallet.id },
      });
      if (existingLock) {
        throw new ConflictError('Wallet is already locked (player may be seated elsewhere)');
      }

      await tx.walletLock.create({
        data: {
          walletAccountId: wallet.id,
          lockedBy: 'onboard',
          tableSessionId: params.tableSessionId,
        },
      });

      // 6. Record buy-in transaction
      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + params.buyinAmount;

      await tx.walletAccount.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      const walletTx = await tx.walletTransaction.create({
        data: {
          walletAccountId: wallet.id,
          type: 'buyin',
          amount: params.buyinAmount,
          balanceBefore,
          balanceAfter,
        },
      });

      // 7. Ensure tournament registration with active accrual
      await tx.tournamentRegistration.upsert({
        where: {
          single_active_accrual: {
            playerId: params.playerId,
            activeAccrual: true,
          },
        },
        update: {},
        create: {
          tournamentId: params.tournamentId,
          playerId: params.playerId,
          activeAccrual: true,
        },
      });

      // 8. Create seat assignment
      const seat = await tx.seatAssignment.create({
        data: {
          tableSessionId: params.tableSessionId,
          playerId: params.playerId,
          seatNumber: params.seatNumber,
          state: 'seated',
        },
      });

      return { seat, walletTx, walletId: wallet.id };
    });
  }

  /**
   * Atomic detach: update seat + record cashout + unlock wallet.
   */
  async detachPlayer(params: {
    seatAssignmentId: number;
    cashoutAmount: number;
    reason: 'detached' | 'surrendered';
  }) {
    return prisma.$transaction(async (tx) => {
      const seat = await tx.seatAssignment.findUniqueOrThrow({
        where: { id: params.seatAssignmentId },
        include: { player: { include: { walletAccounts: { include: { lock: true } } } } },
      });

      // Find the locked wallet for this player
      const lockedWallet = seat.player.walletAccounts.find(wa => wa.lock !== null);
      if (!lockedWallet) {
        throw new BadRequestError('No locked wallet found for this player');
      }

      // 1. Update seat state
      const newState = params.reason === 'surrendered' ? 'surrendered' as const : 'detached' as const;
      await tx.seatAssignment.update({
        where: { id: params.seatAssignmentId },
        data: { state: newState },
      });

      // 2. Record cashout/surrender transaction
      const balanceBefore = lockedWallet.balance;
      const balanceAfter = balanceBefore - params.cashoutAmount;
      const txType = params.reason === 'surrendered' ? 'surrender' as const : 'cashout' as const;

      await tx.walletAccount.update({
        where: { id: lockedWallet.id },
        data: { balance: balanceAfter },
      });

      const walletTx = await tx.walletTransaction.create({
        data: {
          walletAccountId: lockedWallet.id,
          type: txType,
          amount: params.cashoutAmount,
          balanceBefore,
          balanceAfter,
        },
      });

      // 3. Unlock wallet
      await tx.walletLock.delete({
        where: { walletAccountId: lockedWallet.id },
      });

      // 4. Deactivate accrual
      await tx.tournamentRegistration.updateMany({
        where: { playerId: seat.playerId, activeAccrual: true },
        data: { activeAccrual: false },
      });

      return { walletTx };
    });
  }
}

export class ConflictError extends Error {
  status = 409;
  constructor(message: string) { super(message); this.name = 'ConflictError'; }
}

export class BadRequestError extends Error {
  status = 400;
  constructor(message: string) { super(message); this.name = 'BadRequestError'; }
}

export const walletService = new WalletService();
