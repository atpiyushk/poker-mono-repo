import { prisma, cleanDb, seedBase, createPlayer } from './helpers';
import { walletService, ConflictError, BadRequestError } from '../services/walletService';

describe('Wallet Lock/Unlock State Machine', () => {
  let event: any, tournament: any, session: any, player: any;

  beforeAll(async () => {
    await cleanDb();
    const base = await seedBase();
    event = base.event;
    tournament = base.tournament;
    session = base.session;
    player = await createPlayer('WalletTestPlayer');
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  it('should create a wallet and lock it on onboard', async () => {
    const wallet = await walletService.getOrCreateWallet(player.id, event.id);
    expect(wallet).toBeDefined();
    expect(wallet.balance).toBe(0);
    expect(wallet.lock).toBeNull();

    await walletService.lockWallet(wallet.id, 'onboard', session.id);
    const locked = await walletService.isLocked(wallet.id);
    expect(locked).toBe(true);
  });

  it('should fail to double-lock a wallet', async () => {
    const wallet = await walletService.getOrCreateWallet(player.id, event.id);
    await expect(walletService.lockWallet(wallet.id, 'onboard', session.id)).rejects.toThrow(ConflictError);
  });

  it('should unlock wallet on detach', async () => {
    const wallet = await walletService.getOrCreateWallet(player.id, event.id);
    await walletService.unlockWallet(wallet.id);
    const locked = await walletService.isLocked(wallet.id);
    expect(locked).toBe(false);
  });

  it('should fail to unlock an already unlocked wallet', async () => {
    const wallet = await walletService.getOrCreateWallet(player.id, event.id);
    await expect(walletService.unlockWallet(wallet.id)).rejects.toThrow(BadRequestError);
  });

  it('should record buy-in transaction and update balance', async () => {
    const wallet = await walletService.getOrCreateWallet(player.id, event.id);
    const result = await walletService.recordTransaction(wallet.id, 'buyin', 1000, 'Initial buy-in');
    expect(result.balanceBefore).toBe(0);
    expect(result.balanceAfter).toBe(1000);
  });

  it('should record cashout transaction and decrease balance', async () => {
    const wallet = await walletService.getOrCreateWallet(player.id, event.id);
    const result = await walletService.recordTransaction(wallet.id, 'cashout', 500, 'Cash out');
    expect(result.balanceBefore).toBe(1000);
    expect(result.balanceAfter).toBe(500);
  });

  it('should record rebuy and increase balance', async () => {
    const wallet = await walletService.getOrCreateWallet(player.id, event.id);
    const result = await walletService.recordTransaction(wallet.id, 'rebuy', 200);
    expect(result.balanceAfter).toBe(700);
  });
});
