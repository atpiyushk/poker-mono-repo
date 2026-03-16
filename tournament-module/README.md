# Tournament Module

A standalone tournament management system that passively integrates with existing LAN-based poker table servers via WebSocket.

## Architecture

```
┌─────────────────────┐
│  Table Server 1     │──── ws ────┐
│  (Scala/Play :9000) │            │
└─────────────────────┘            │
┌─────────────────────┐            ▼
│  Table Server 2     │──── ws ──► Tournament Server (Node.js :4000)
│  (Scala/Play :9001) │            │    ├── WS Connector Manager
└─────────────────────┘            │    ├── Message Parser (registry)
                                   │    ├── Scoring Engine (pluggable)
                                   │    ├── Wallet Service (lock FSM)
                                   │    ├── Leaderboard Service
                                   │    └── REST API + Live WS
                                   │
                                   ▼
                              PostgreSQL :5433
                                   │
                   ┌───────────────┼───────────────┐
                   ▼               ▼               ▼
              Admin UI        Dealer UI      Projector View
              (React)         (React)        (React, full-screen)
```

## Quick Start (Docker)

```bash
# From tournament-module/ directory
docker compose up -d

# Access:
# - Frontend:  http://localhost:4001
# - Backend:   http://localhost:4000
# - Database:  postgresql://tournament:tournament@localhost:5433/tournament_db
```

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (or use Docker for DB only)

### 1. Start Database

```bash
# Option A: Docker (recommended)
docker compose up tournament-db -d

# Option B: Local PostgreSQL
createdb tournament_db
```

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Set environment
cp .env.example .env
# Edit .env if needed (DATABASE_URL, JWT_SECRET, PORT)

# Generate Prisma client + push schema
npx prisma generate
npx prisma db push

# Start dev server
npm run dev
```

Backend runs on `http://localhost:4000`.

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies API to :4000)
npm run dev
```

Frontend runs on `http://localhost:4001`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://tournament:tournament@localhost:5433/tournament_db` | PostgreSQL connection string |
| `JWT_SECRET` | `dev-secret-change-me` | Secret for JWT token signing |
| `PORT` | `4000` | Backend server port |
| `TABLE_URLS` | _(empty)_ | Comma-separated table server URLs for auto-discovery |

## Testing

```bash
cd backend

# Requires a running PostgreSQL database
# Tests use the same DATABASE_URL
npm test
```

Test suites:
- `wallet.test.ts` — Wallet lock/unlock state machine, transactions
- `onboarding.test.ts` — Atomic onboard (lock + seat + buyin), detach flows
- `singleTournament.test.ts` — Single active tournament accrual enforcement
- `tableAttach.test.ts` — Table attach/detach with session boundaries
- `screenName.test.ts` — Unique screen name enforcement
- `seatLimit.test.ts` — 8-seat maximum per table
- `minPlayers.test.ts` — Minimum 3 players to start gating

## API Overview

### Auth
- `POST /api/auth/login` — Get JWT token (username, password, role: admin|dealer)

### Admin (requires admin JWT)
- `POST/GET /api/admin/events` — Create/list events
- `POST/GET/PUT/DELETE /api/admin/tournaments` — CRUD tournaments
- `POST /api/admin/tournaments/:id/start|pause|complete` — Lifecycle
- `POST/GET/DELETE /api/admin/tables` — Table registry
- `POST /api/admin/tournaments/:tid/tables/:tableId/attach|detach` — Table attachment
- `GET /api/admin/tournaments/:id/leaderboard` — Leaderboard
- `GET /api/admin/system/health` — WebSocket health

### Dealer (requires dealer or admin JWT)
- `GET /api/dealer/tournaments/active` — Active tournaments
- `POST /api/dealer/table/:tableId/attach` — Attach table
- `GET /api/dealer/players/search?q=` — Search screen names
- `POST /api/dealer/table/:tableId/onboard` — Onboard player (blocking)
- `POST /api/dealer/table/:tableId/rebuy` — Rebuy
- `POST /api/dealer/table/:tableId/sitout|return|surrender|detach/:seatId` — Seat actions
- `GET /api/dealer/table/:tableId/seats?tournamentId=` — Seat map

### Registration (public)
- `POST /api/register` — Register player
- `GET /api/register/check-screen-name?name=` — Check availability
- `GET /api/register/players/:id/badge` — Badge data

### Leaderboard (public)
- `GET /api/leaderboard/:tournamentId` — Public leaderboard

### Live Updates (WebSocket)
- `ws://host:4000/ws/live` — Subscribe to channels:
  - `leaderboard:{tournamentId}` — Real-time leaderboard updates
  - `health` — Table connection health changes
  - `table:{tableId}` — Table state updates

## Database Schema

20 tables organized into domains:

- **Events & Tournaments**: `events`, `tournaments`
- **Tables**: `tables_registry`, `tournament_tables`, `table_sessions`
- **Players**: `players`, `tournament_registrations`, `seat_assignments`
- **Wallet**: `wallet_accounts`, `wallet_locks`, `wallet_transactions`
- **Message Ingestion**: `message_events`, `hand_events`, `hand_results`
- **Scoring**: `scoring_runs`, `points_ledger`, `leaderboard_snapshots`
- **System**: `system_health`

## Scoring Engine

The scoring engine is pluggable. The default formula is:

```
points_delta = net_chips_won_this_hand  (winAmount - totalBet)
```

To implement a custom formula, modify `backend/src/services/scoringEngine.ts` and implement the `ScoringPlugin` interface:

```typescript
interface ScoringPlugin {
  version: string;
  compute(handResults: HandResultInput[]): PointsDelta[];
}
```

All historical data is preserved with `formula_version` tagging.

## WebSocket Integration

The Tournament Server connects to each attached table's admin WebSocket endpoint:

```
ws://<table-url>/holdem/wsclient/admin
```

It passively listens for:
- `InitialData` — Table snapshot on connect
- `tableDataUpdated` — Real-time state changes (detects hand completion at stage 16/18)
- `ROUND_RESULT` — Round completion with per-player results
- `MoneyTransactionMsg` — Financial transactions
- `PlayerUpdatedMsg` — Player status changes

All messages are stored in `message_events` (append-only). Known message types are parsed into normalized `hand_events` and `hand_results`.
