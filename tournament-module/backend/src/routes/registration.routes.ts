import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const registrationRouter = Router();

// Public endpoint — no auth required

registrationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, screenName } = req.body;

    if (!firstName || !lastName || !email || !screenName) {
      res.status(400).json({ error: 'firstName, lastName, email, screenName are required' });
      return;
    }

    // Check screen name uniqueness (case-insensitive)
    const existing = await prisma.player.findFirst({
      where: { screenName: { equals: screenName, mode: 'insensitive' } },
    });
    if (existing) {
      res.status(409).json({ error: 'Screen name is already taken' });
      return;
    }

    // Check email uniqueness
    const existingEmail = await prisma.player.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(409).json({ error: 'Email is already registered' });
      return;
    }

    const player = await prisma.player.create({
      data: { firstName, lastName, email, phone: phone || null, screenName },
    });

    res.status(201).json(player);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Check screen name availability
registrationRouter.get('/check-screen-name', async (req: Request, res: Response) => {
  try {
    const name = String(req.query.name || '');
    if (!name) { res.json({ available: false }); return; }

    const existing = await prisma.player.findFirst({
      where: { screenName: { equals: name, mode: 'insensitive' } },
    });
    res.json({ available: !existing });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Badge view data
registrationRouter.get('/players/:id/badge', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: Number(req.params.id) },
      select: { id: true, firstName: true, lastName: true, screenName: true },
    });
    if (!player) { res.status(404).json({ error: 'Player not found' }); return; }
    res.json(player);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
