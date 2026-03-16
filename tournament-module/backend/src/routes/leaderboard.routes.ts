import { Router, Request, Response } from 'express';
import { getLeaderboard } from '../services/leaderboardService';

export const leaderboardRouter = Router();

// Public endpoint — no auth required

leaderboardRouter.get('/:tournamentId', async (req: Request, res: Response) => {
  try {
    const tournamentId = Number(req.params.tournamentId);
    if (isNaN(tournamentId)) {
      res.status(400).json({ error: 'Invalid tournament ID' });
      return;
    }

    const leaderboard = await getLeaderboard(tournamentId);
    res.json(leaderboard);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
