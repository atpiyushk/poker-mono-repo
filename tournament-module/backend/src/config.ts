import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://tournament:tournament@localhost:5433/tournament_db',
  tableUrls: process.env.TABLE_URLS ? process.env.TABLE_URLS.split(',').map(u => u.trim()) : [],
  ws: {
    heartbeatIntervalMs: 15_000,
    heartbeatTimeoutMs: 10_000,
    reconnect: {
      initialDelayMs: 1_000,
      maxDelayMs: 30_000,
      multiplier: 2,
    },
  },
  scoring: {
    formulaVersion: 'v1',
  },
};
