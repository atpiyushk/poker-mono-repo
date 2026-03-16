import { prisma, cleanDb } from './helpers';

describe('Unique Screen Name Enforcement', () => {
  beforeAll(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  it('should allow creating a player with unique screen name', async () => {
    const player = await prisma.player.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        screenName: 'JohnnyPoker',
      },
    });
    expect(player.screenName).toBe('JohnnyPoker');
  });

  it('should reject duplicate screen name (exact match)', async () => {
    await expect(
      prisma.player.create({
        data: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@test.com',
          screenName: 'JohnnyPoker',
        },
      })
    ).rejects.toThrow();
  });

  it('should reject duplicate email', async () => {
    await expect(
      prisma.player.create({
        data: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'john@test.com',
          screenName: 'JanePoker',
        },
      })
    ).rejects.toThrow();
  });

  it('should allow different screen names', async () => {
    const player = await prisma.player.create({
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@test.com',
        screenName: 'JaneAces',
      },
    });
    expect(player.screenName).toBe('JaneAces');
  });
});
