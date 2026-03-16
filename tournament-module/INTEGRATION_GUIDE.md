# Tournament Module -- Game-Side Integration Guide

> **Audience**: Engineers working on the poker table server (Scala/Play) or tablet apps.
> This document describes every API, WebSocket channel, database table, message format,
> and behavioral contract exposed by the Tournament Module so that game-side changes
> can be made with full knowledge of what the tournament server expects and provides.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Network Topology](#2-network-topology)
3. [How the Tournament Server Connects to Table Servers](#3-how-the-tournament-server-connects-to-table-servers)
4. [WebSocket Messages the Tournament Server Listens For](#4-websocket-messages-the-tournament-server-listens-for)
5. [WebSocket Messages the Tournament Server Sends to Browser UIs](#5-websocket-messages-the-tournament-server-sends-to-browser-uis)
6. [REST API Reference (Complete)](#6-rest-api-reference-complete)
7. [Database Schema (All Tables, All Columns)](#7-database-schema-all-tables-all-columns)
8. [Enums and Allowed Values](#8-enums-and-allowed-values)
9. [Wallet Lock State Machine](#9-wallet-lock-state-machine)
10. [Scoring Pipeline](#10-scoring-pipeline)
11. [Session Boundary Logic](#11-session-boundary-logic)
12. [Business Rules and Constraints](#12-business-rules-and-constraints)
13. [What Game-Side Engineers Need to Build / Change](#13-what-game-side-engineers-need-to-build--change)

---

## 1. System Overview

The Tournament Module is a **passive observer**. It connects to each poker table server's
admin WebSocket endpoint and records every message into its own PostgreSQL database. It
does NOT send commands to the table servers (read-only listener). All tournament management
(scoring, wallets, leaderboards) happens on the tournament server side.

```
Poker Table Server (Scala :9000)
        │
        │ admin WebSocket (existing)
        ▼
Tournament Server (Node.js :4000)  ──►  PostgreSQL :5433
        │
        │ /ws/live  (new WS for UIs)
        ▼
Admin UI / Dealer UI / Projector (React :4001)
```

---

## 2. Network Topology

| Component             | Default Port | Protocol       | Notes                                            |
|-----------------------|-------------|----------------|--------------------------------------------------|
| Poker Table Server    | 9000+       | HTTP + WS      | One per physical table, on sub-LAN               |
| Tournament Server     | 4000        | HTTP + WS      | One centralized, on same LAN                     |
| Tournament DB         | 5433        | PostgreSQL     | Separate from the game DB (which uses 5432)      |
| Tournament Frontend   | 4001        | HTTP           | Served by Vite dev server or nginx in production |

All table servers must be reachable from the tournament server on the same subnet.

---

## 3. How the Tournament Server Connects to Table Servers

### Connection Lifecycle

1. Admin or dealer triggers "Attach Table" via REST API.
2. Tournament server opens a WebSocket connection to: `ws://<table_url>/holdem/wsclient/admin`
3. On connection open, sends: `{"MessageType":"INITIALIZE_ADMIN"}`
4. Table server responds with `InitialData` message (full table snapshot).
5. Tournament server then passively listens to ALL subsequent messages.
6. On "Detach Table", the WebSocket is closed.

### Reconnection

- Exponential backoff: 1s, 2s, 4s, 8s ... max 30s
- Heartbeat: ping every 15s; if no pong within 10s, connection is terminated and reconnect begins
- All connection state changes are recorded in the `system_health` table

### What the Tournament Server Does NOT Do

- It never sends game commands (no fold, bet, raise, etc.)
- It never sends admin commands (no deposit, withdraw, new game, etc.)
- It only sends `INITIALIZE_ADMIN` on connect, then listens

---

## 4. WebSocket Messages the Tournament Server Listens For

These are the messages the tournament server parses from the table's admin WebSocket.
The tournament server stores ALL messages raw (even unknown types) in the `message_events` table.
Known types are additionally parsed into normalized `hand_events` and `hand_results`.

### 4.1 `InitialData` (received on connection)

**What we extract**: Table snapshot, seat occupancy, player balances, config.

```json
{
  "MessageType": "InitialData",
  "TableId": "4000",
  "destination": "admin",
  "clientId": "<string>",
  "roundId": 12345,
  "timestamp": "<ISO string>",
  "data": {
    "roundId": 12345,
    "configData": {
      "pokerVariant": "Texas",         // "Texas" | "Omaha"
      "betLimit": "No Limit",          // "Limit" | "Pot Limit" | "No Limit"
      "liveDealer": false,
      "tournamentMode": true,
      "rakePercent": 5,
      "blind": 100,
      "playerCardsConfig": { "count": 2, "min": 2, "max": 2 },
      "communityCardsConfig": { "count": 5, "min": 3, "max": 5 }
    },
    "stage": "1",
    "potAmount": 0.0,
    "seats": [
      {
        "id": 0,               // seat index 0-7
        "name": "Player1",
        "ip": "192.168.1.1",
        "uid": "player1",
        "balance": 1000.0,
        "connected": true,
        "totalBet": 0.0,
        "winAmount": 0.0,
        "gameStatus": "Playing",
        "isPlaying": true,
        "isDealer": false,
        "isTurn": false,
        "cards": [],
        "betList": [],
        "bets": [0, 0, 0, 0, 0]
      }
      // ... up to 8 seats (id 0-7)
    ],
    "winners": [],
    "gameCards": [],
    "sidePots": [],
    "hands": []
  },
  "players": [],
  "transactions": [],
  "operations": [],
  "history": []
}
```

**Stored as**: `hand_events` row with `eventType = "initial_snapshot"`.

---

### 4.2 `tableDataUpdated` (received on every state change)

This is the **most important** message. It fires on every game state transition.
The tournament server watches for `stage === "16"` (showdown) or `stage === "18"` (winner showdown)
to detect hand completion.

```json
{
  "MessageType": "tableDataUpdated",
  "data": {
    "roundId": 12345,
    "stage": "16",            // <── CRITICAL: "16" or "18" = hand ended
    "potAmount": 2000.0,
    "betAmount": 100.0,
    "raiseAmount": 200.0,
    "configData": { /* same as InitialData */ },
    "seats": [
      {
        "id": 0,              // seat index 0-7
        "uid": "player1",
        "name": "Player1",
        "balance": 1500.0,    // balance AFTER win/loss
        "totalBet": 200.0,    // total bet THIS hand
        "winAmount": 500.0,   // amount won THIS hand (0 if lost)
        "lastWin": 0.0,
        "gameStatus": "Win-Straight Flush",  // or "Lost-...", "FOLDED", "ALL IN", "Playing"
        "isPlaying": true,
        "isDealer": true,
        "isTurn": false,
        "cards": ["As", "Ks"],
        "betList": [
          { "index": 0, "betValue": 100.0, "group": "PreFlop", "betType": "Call" }
        ],
        "bets": [100.0, 50.0, 50.0, 0.0, 0.0]
      }
      // ... all 8 seats
    ],
    "winners": [
      {
        "id": 0,              // seat index of winner
        "winningPot": 0,
        "winAmount": 500,
        "rake": 25.0,
        "totalBet": 200.0,
        "hand": "Straight Flush",
        "cards": ["As", "Ks", "Qs", "Js", "Ts"]
      }
    ],
    "gameCards": ["Qs", "Js", "Ts", "9s", "2h"],   // community cards
    "sidePots": [],
    "hands": [
      [0, ["As", "Ks"], ["As", "Ks", "Qs", "Js", "Ts"], "Straight Flush"]
    ]
  },
  "timestamp": "Thu, 12 Feb 2026 10:30:00.000 UTC"
}
```

**How we use it**:

When `stage === "16"` or `stage === "18"`:

For each seat where `isPlaying === true` OR `gameStatus` starts with `"Win"`, `"Lost"`, `"FOLDED"`:
```
net_chips  = seat.winAmount - seat.totalBet
is_winner  = seat appears in winners array
```

These go into `hand_results` with fields:
| Field        | Source                            |
|-------------|-----------------------------------|
| handId      | `data.roundId` (as string)        |
| playerId    | Looked up from `seat_assignments` matching `seatNumber = seat.id + 1` |
| seatId      | `seat.id` (0-7)                   |
| netChips    | `seat.winAmount - seat.totalBet`  |
| totalBet    | `seat.totalBet`                   |
| winAmount   | `seat.winAmount`                  |
| winningHand | `winner.hand` (if in winners)     |
| isWinner    | `true` if in winners array        |

**Stored as**: `hand_events` row with `eventType = "hand_ended"`, plus individual `hand_results` rows.

---

### 4.3 `ROUND_RESULT` (received when round ends)

```json
{
  "MessageType": "ROUND_RESULT",
  "transType": "Win",
  "tableId": "4000",
  "gameName": "Texas Hold'em",
  "roundId": 12345,
  "winningHand": ["Straight Flush"],
  "gameResult": "{...JSON string...}",
  "playersTotalBet": [["player1", 200.0], ["player2", 300.0]],
  "playerBetsList": "{...JSON string...}",
  "timestamp": "Thu, 12 Feb 2026 10:30:00.000 UTC"
}
```

**Stored as**: `hand_events` row with `eventType = "round_result"`.

---

### 4.4 Money Transaction Messages

These share a common shape. `MessageType` varies:

| MessageType         | transType  | When                           |
|---------------------|-----------|--------------------------------|
| `DEPOSIT_REQ`       | Cashier   | Admin requests deposit         |
| `DEPOSIT_SUCCESS`   | Cashier   | Deposit confirmed              |
| `WITHDRAW_REQ`      | Cashier   | Admin requests withdrawal      |
| `WITHDRAW_SUCCESS`  | Cashier   | Withdrawal confirmed           |
| `PLAYER_BET_PLACED` | Bet       | Player places bet in round     |
| `PLAYER_BET_WON`    | Win       | Player wins pot                |
| `PLAYER_BET_LOST`   | NoWin     | Player loses (round end)       |

```json
{
  "MessageType": "PLAYER_BET_WON",
  "transType": "Win",
  "playerIp": "192.168.1.1",
  "rake": 25.0,
  "roundId": 12345,
  "amount": 500.0,
  "oldBalance": 800.0,
  "newBalance": 1300.0,
  "timestamp": "Thu, 12 Feb 2026 10:30:00.000 UTC"
}
```

**Stored as**: `hand_events` row with `eventType = "money_<messagetype_lowercase>"`.

---

### 4.5 Player Status Messages

| MessageType       | When                    |
|-------------------|-------------------------|
| `PLAYER_UPDATED`  | Player data changes     |
| `PLAYER_ONLINE`   | Player connects         |
| `PLAYER_OFFLINE`  | Player disconnects      |
| `PLAYER_CREATED`  | New player registered   |

```json
{
  "MessageType": "PLAYER_ONLINE",
  "player": {
    "client_ip": "192.168.1.1",
    "client_id": "<string>",
    "nickname": "Player1",
    "uid": "player1",
    "balance": 1000.0,
    "status": "online",
    "usage": "unlocked"
  },
  "timestamp": "..."
}
```

**Stored as**: `hand_events` row with `eventType = "player_online"` / `"player_offline"` / `"player_status"` / `"player_created"`.

---

### 4.6 Game Stage Values (for reference)

| Stage | Name                      | Tournament Relevance                |
|-------|---------------------------|-------------------------------------|
| 1     | Ready                     | Table idle                          |
| 2     | Election Started          | Dealer selection                    |
| 3     | Election Complete         | Dealer assigned                     |
| 4     | Hole Cards Dealt          | Hand started                        |
| 5     | Pre-Flop Betting          |                                     |
| 6     | Pre-Flop Confirm          |                                     |
| 7     | Flop Dealt                |                                     |
| 8     | Flop Betting              |                                     |
| 9     | Flop Confirm              |                                     |
| 10    | Turn Dealt                |                                     |
| 11    | Turn Betting              |                                     |
| 12    | Turn Confirm              |                                     |
| 13    | River Dealt               |                                     |
| 14    | River Betting             |                                     |
| 15    | River Confirm             |                                     |
| **16** | **Showdown**             | **HAND ENDED -- scoring triggered** |
| 17    | Knockout                  | Only one player left                |
| **18** | **Winner Showdown**      | **HAND ENDED -- scoring triggered** |

---

## 5. WebSocket Messages the Tournament Server Sends to Browser UIs

The tournament server runs its OWN WebSocket at `ws://<tournament-server>:4000/ws/live`.
Admin dashboard, dealer console, and projector view connect to this.

### 5.1 Subscribe / Unsubscribe

Client sends:

```json
{ "action": "subscribe", "channel": "leaderboard:5" }
{ "action": "unsubscribe", "channel": "leaderboard:5" }
```

Server responds:

```json
{ "type": "subscribed", "channel": "leaderboard:5" }
```

### 5.2 Available Channels

| Channel Pattern            | Payload Type          | When Sent                        |
|---------------------------|-----------------------|----------------------------------|
| `leaderboard:<tournamentId>` | `leaderboard_update` | After every hand is scored       |
| `health`                   | `health_update`       | Table WS connects/disconnects    |
| `table:<tableId>`          | `table_update`        | Every message from that table    |

### 5.3 Leaderboard Update Payload

```json
{
  "channel": "leaderboard:5",
  "type": "leaderboard_update",
  "data": [
    {
      "rank": 1,
      "playerId": 42,
      "screenName": "AceKing",
      "firstName": "John",
      "lastName": "Doe",
      "totalPoints": 15000,
      "handsPlayed": 47,
      "lastDelta": 500
    }
  ]
}
```

### 5.4 Health Update Payload

```json
{
  "channel": "health",
  "type": "health_update",
  "data": { "tableId": "4000", "status": "connected" }
}
```

### 5.5 Table State Update Payload

```json
{
  "channel": "table:4000",
  "type": "table_update",
  "data": {
    "messageType": "tableDataUpdated",
    "events": [
      { "handId": "12345", "eventType": "hand_ended", "data": { "..." } }
    ]
  }
}
```

---

## 6. REST API Reference (Complete)

Base URL: `http://<tournament-server>:4000`

All responses are JSON. Errors return `{ "error": "<message>" }`.

### 6.1 Authentication

| Method | Path              | Auth | Body                                         | Response                          |
|--------|-------------------|------|----------------------------------------------|-----------------------------------|
| POST   | `/api/auth/login` | None | `{ "username": "x", "password": "y", "role": "admin" \| "dealer" }` | `{ "token": "jwt...", "role": "admin" }` |

Token goes in `Authorization: Bearer <token>` header for protected routes.

---

### 6.2 Admin Routes (require `admin` role)

#### Events

| Method | Path                   | Body                                   | Response                |
|--------|------------------------|----------------------------------------|-------------------------|
| POST   | `/api/admin/events`    | `{ "name": "Event 1", "description": "..." }` | Event object (201)     |
| GET    | `/api/admin/events`    | --                                     | Event[] with tournaments |
| GET    | `/api/admin/events/:id`| --                                     | Event with tournaments  |

#### Tournaments

| Method | Path                                | Body / Query                                   | Response              |
|--------|-------------------------------------|------------------------------------------------|-----------------------|
| POST   | `/api/admin/tournaments`            | `{ "eventId": 1, "name": "T1", "family": "Poker", "variant": "TexasHoldem", "limitType": "NoLimit" }` | Tournament (201) |
| GET    | `/api/admin/tournaments`            | `?eventId=1` (optional)                        | Tournament[]          |
| GET    | `/api/admin/tournaments/:id`        | --                                             | Tournament (full)     |
| PUT    | `/api/admin/tournaments/:id`        | `{ "name": "New Name", "endedAt": "ISO" }`    | Tournament            |
| DELETE | `/api/admin/tournaments/:id`        | `?force=true` (optional)                       | `{ "deleted": true }` |
| POST   | `/api/admin/tournaments/:id/start`  | --                                             | Tournament            |
| POST   | `/api/admin/tournaments/:id/pause`  | --                                             | Tournament            |
| POST   | `/api/admin/tournaments/:id/complete` | --                                           | Tournament            |

**Enum values for body fields**:
- `family`: `"Poker"` | `"TeenPatti"`
- `variant`: `"TexasHoldem"` | `"Omaha"` | `"Pineapple"`
- `limitType`: `"NoLimit"` | `"PotLimit"` | `"TableLimit"`

#### Table Registry

| Method | Path                | Body                                                        | Response           |
|--------|---------------------|-------------------------------------------------------------|--------------------|
| POST   | `/api/admin/tables` | `{ "tableId": "4000", "url": "ws://192.168.1.10:9000", "displayName": "Table 1" }` | TableRegistry (201) |
| GET    | `/api/admin/tables` | --                                                          | TableRegistry[] with health + attachments |
| DELETE | `/api/admin/tables/:id` | --                                                      | `{ "deleted": true }` |

#### Table Attach / Detach

| Method | Path                                                     | Body | Response |
|--------|----------------------------------------------------------|------|----------|
| POST   | `/api/admin/tournaments/:tid/tables/:tableId/attach`     | --   | `{ "tournamentTable": {...}, "session": {...} }` |
| POST   | `/api/admin/tournaments/:tid/tables/:tableId/detach`     | --   | `{ "detached": true }` |

`:tableId` is the **string** table ID (e.g., `"4000"`), not the numeric DB ID.

Side effects of attach:
1. Creates `tournament_tables` row
2. Creates `table_sessions` row (reset boundary)
3. Opens WebSocket to table server
4. Creates `system_health` row

Side effects of detach:
1. Closes `table_sessions` (sets `ended_at`)
2. Marks `tournament_tables.is_attached = false`
3. Closes WebSocket connection

#### Leaderboard

| Method | Path                                       | Response |
|--------|--------------------------------------------|----------|
| GET    | `/api/admin/tournaments/:id/leaderboard`   | LeaderboardEntry[] |

#### System Health

| Method | Path                     | Response |
|--------|--------------------------|----------|
| GET    | `/api/admin/system/health` | SystemHealth[] with table info |

---

### 6.3 Dealer Routes (require `dealer` or `admin` role)

| Method | Path                                          | Body / Query                                                   | Response |
|--------|-----------------------------------------------|----------------------------------------------------------------|----------|
| GET    | `/api/dealer/tournaments/active`              | --                                                             | Tournament[] (status=active only) |
| POST   | `/api/dealer/table/:tableId/attach`           | `{ "tournamentId": 5 }`                                       | `{ "tournamentTable": {...}, "session": {...} }` |
| GET    | `/api/dealer/players/search`                  | `?q=ace` (searches screenName, firstName, lastName)            | Player[] (max 20) |
| POST   | `/api/dealer/table/:tableId/onboard`          | `{ "playerId": 1, "seatNumber": 3, "buyinAmount": 1000, "tournamentId": 5 }` | `{ "success": true, "seat": {...}, "walletTx": {...} }` |
| POST   | `/api/dealer/table/:tableId/rebuy`            | `{ "playerId": 1, "amount": 500, "tournamentId": 5 }`        | WalletTransaction |
| POST   | `/api/dealer/table/:tableId/sitout/:seatId`   | --                                                             | `{ "success": true }` |
| POST   | `/api/dealer/table/:tableId/return/:seatId`   | --                                                             | `{ "success": true }` |
| POST   | `/api/dealer/table/:tableId/surrender/:seatId`| `{ "cashoutAmount": 800 }`                                    | WalletTransaction |
| POST   | `/api/dealer/table/:tableId/detach/:seatId`   | `{ "cashoutAmount": 800 }`                                    | WalletTransaction |
| GET    | `/api/dealer/table/:tableId/seats`            | `?tournamentId=5` (required)                                  | `{ "seats": [...], "seatedCount": 3, "canStart": true }` |

**Onboard response on error**:
- `409` -- Wallet already locked (player seated elsewhere), or player accruing in another tournament
- `400` -- Seat taken, seat out of range, table not attached

`:seatId` in sitout/return/surrender/detach is the **numeric `seat_assignments.id`** from the DB, not the seat number.

---

### 6.4 Registration Routes (PUBLIC -- no auth)

| Method | Path                               | Body / Query                                                                          | Response |
|--------|------------------------------------|---------------------------------------------------------------------------------------|----------|
| POST   | `/api/register`                    | `{ "firstName": "John", "lastName": "Doe", "email": "j@x.com", "phone": "555", "screenName": "AceKing" }` | Player (201) |
| GET    | `/api/register/check-screen-name`  | `?name=AceKing`                                                                       | `{ "available": true \| false }` |
| GET    | `/api/register/players/:id/badge`  | --                                                                                    | `{ "id": 1, "firstName": "John", "lastName": "Doe", "screenName": "AceKing" }` |

Screen name check is **case-insensitive**.

---

### 6.5 Leaderboard Routes (PUBLIC -- no auth)

| Method | Path                               | Response |
|--------|-------------------------------------|----------|
| GET    | `/api/leaderboard/:tournamentId`    | LeaderboardEntry[] |

**LeaderboardEntry shape**:
```json
{
  "rank": 1,
  "playerId": 42,
  "screenName": "AceKing",
  "firstName": "John",
  "lastName": "Doe",
  "totalPoints": 15000,
  "handsPlayed": 47,
  "lastDelta": 500
}
```

---

## 7. Database Schema (All Tables, All Columns)

Database: PostgreSQL. Schema managed by Prisma ORM.

### 7.1 `events`

| Column      | Type      | Constraints            | Description                    |
|-------------|-----------|------------------------|--------------------------------|
| id          | serial    | PK                     | Auto-increment ID              |
| name        | text      | NOT NULL               | Event name                     |
| description | text      | nullable               | Optional description           |
| created_at  | timestamp | DEFAULT now()          | Creation time                  |
| updated_at  | timestamp | auto-updated           | Last modification              |

### 7.2 `tournaments`

| Column      | Type              | Constraints            | Description                    |
|-------------|-------------------|------------------------|--------------------------------|
| id          | serial            | PK                     |                                |
| event_id    | int               | FK -> events.id        | Parent event                   |
| name        | text              | NOT NULL               | Tournament name                |
| family      | GameFamily enum   | NOT NULL               | Poker / TeenPatti              |
| variant     | PokerVariant enum | NOT NULL               | TexasHoldem / Omaha / Pineapple|
| limit_type  | LimitType enum    | NOT NULL               | NoLimit / PotLimit / TableLimit|
| status      | TournamentStatus  | DEFAULT 'draft'        | draft/active/paused/completed/cancelled |
| started_at  | timestamp         | nullable               | When started                   |
| ended_at    | timestamp         | nullable               | When ended                     |
| created_at  | timestamp         | DEFAULT now()          |                                |
| updated_at  | timestamp         | auto-updated           |                                |

### 7.3 `tables_registry`

| Column       | Type      | Constraints            | Description                    |
|--------------|-----------|------------------------|--------------------------------|
| id           | serial    | PK                     |                                |
| table_id     | text      | UNIQUE, NOT NULL       | Human-readable table ID (e.g., "4000") |
| url          | text      | NOT NULL               | WS URL on LAN (e.g., "ws://192.168.1.10:9000") |
| display_name | text      | NOT NULL               | Friendly name (e.g., "Table 1 - Main Hall") |
| created_at   | timestamp | DEFAULT now()          |                                |

### 7.4 `tournament_tables`

| Column        | Type      | Constraints                | Description                    |
|---------------|-----------|----------------------------|--------------------------------|
| id            | serial    | PK                         |                                |
| tournament_id | int       | FK -> tournaments.id       |                                |
| table_id      | int       | FK -> tables_registry.id   |                                |
| attached_at   | timestamp | DEFAULT now()              | When attached                  |
| detached_at   | timestamp | nullable                   | When detached                  |
| is_attached   | boolean   | DEFAULT true               | Currently attached?            |

### 7.5 `table_sessions`

| Column              | Type      | Constraints                   | Description                    |
|---------------------|-----------|-------------------------------|--------------------------------|
| id                  | serial    | PK                            |                                |
| tournament_table_id | int       | FK -> tournament_tables.id    |                                |
| started_at          | timestamp | DEFAULT now()                 | Session start (reset boundary) |
| ended_at            | timestamp | nullable                      | Session end (null = active)    |
| reset_requested     | boolean   | DEFAULT true                  | Whether reset was requested    |

**Purpose**: Only messages received during an active session (after `started_at`, before `ended_at`) count for tournament scoring. This is how we isolate pre-tournament / post-tournament data.

### 7.6 `players`

| Column      | Type      | Constraints              | Description                    |
|-------------|-----------|--------------------------|--------------------------------|
| id          | serial    | PK                       |                                |
| first_name  | text      | NOT NULL                 |                                |
| last_name   | text      | NOT NULL                 |                                |
| email       | text      | UNIQUE, NOT NULL         |                                |
| phone       | text      | nullable                 |                                |
| screen_name | text      | **UNIQUE**, NOT NULL     | Globally unique across all tournaments |
| created_at  | timestamp | DEFAULT now()            |                                |

### 7.7 `tournament_registrations`

| Column         | Type      | Constraints                                        | Description                    |
|----------------|-----------|----------------------------------------------------|--------------------------------|
| id             | serial    | PK                                                 |                                |
| tournament_id  | int       | FK -> tournaments.id                               |                                |
| player_id      | int       | FK -> players.id                                   |                                |
| active_accrual | boolean   | DEFAULT true                                       | Player currently accruing points? |
| registered_at  | timestamp | DEFAULT now()                                      |                                |

**Constraint**: `UNIQUE(player_id, active_accrual)` -- a player can have at most ONE row with `active_accrual = true` across ALL tournaments. This enforces **single active tournament accrual**.

### 7.8 `seat_assignments`

| Column           | Type         | Constraints                  | Description                    |
|------------------|-------------|------------------------------|--------------------------------|
| id               | serial      | PK                           |                                |
| table_session_id | int         | FK -> table_sessions.id      |                                |
| player_id        | int         | FK -> players.id             |                                |
| seat_number      | int         | NOT NULL, range 1-8          | Physical seat (1-indexed)      |
| state            | SeatState   | DEFAULT 'seated'             | seated/sitout/surrendered/detached |
| seated_at        | timestamp   | DEFAULT now()                |                                |
| updated_at       | timestamp   | auto-updated                 |                                |

**IMPORTANT**: `seat_number` is **1-indexed** (1-8) in this DB, while the table server uses **0-indexed** (0-7) seat IDs. The tournament server maps: `db.seatNumber = table.seat.id + 1`.

### 7.9 `wallet_accounts`

| Column    | Type      | Constraints                        | Description                    |
|-----------|-----------|------------------------------------|--------------------------------|
| id        | serial    | PK                                 |                                |
| player_id | int       | FK -> players.id                   |                                |
| event_id  | int       | NOT NULL                           | Scoped to event                |
| balance   | float     | DEFAULT 0                          | Current balance                |
| created_at| timestamp | DEFAULT now()                      |                                |

**Constraint**: `UNIQUE(player_id, event_id)` -- one wallet per player per event.

### 7.10 `wallet_locks`

| Column            | Type      | Constraints                     | Description                    |
|-------------------|-----------|---------------------------------|--------------------------------|
| id                | serial    | PK                              |                                |
| wallet_account_id | int       | **UNIQUE**, FK -> wallet_accounts.id | Max one lock per wallet    |
| locked_by         | text      | NOT NULL                        | "onboard" or "cashin"          |
| table_session_id  | int       | nullable                        | Which session locked it        |
| locked_at         | timestamp | DEFAULT now()                   |                                |

**Row exists = LOCKED. Row absent = UNLOCKED.**

### 7.11 `wallet_transactions`

| Column            | Type          | Constraints                  | Description                    |
|-------------------|---------------|------------------------------|--------------------------------|
| id                | serial        | PK                           |                                |
| wallet_account_id | int           | FK -> wallet_accounts.id     |                                |
| type              | WalletTxType  | NOT NULL                     | buyin/rebuy/cashout/surrender/adjustment |
| amount            | float         | NOT NULL                     | Transaction amount             |
| balance_before    | float         | NOT NULL                     | Balance before tx              |
| balance_after     | float         | NOT NULL                     | Balance after tx               |
| note              | text          | nullable                     |                                |
| created_at        | timestamp     | DEFAULT now()                |                                |

### 7.12 `message_events`

| Column           | Type      | Constraints                  | Description                    |
|------------------|-----------|------------------------------|--------------------------------|
| id               | serial    | PK                           |                                |
| table_session_id | int       | FK -> table_sessions.id      |                                |
| table_id         | text      | NOT NULL                     | String table ID (e.g., "4000") |
| message_type     | text      | NOT NULL                     | MessageType field value        |
| raw_json         | jsonb     | NOT NULL                     | Full raw message               |
| received_at      | timestamp | DEFAULT now()                |                                |

**Indexes**: `(table_id, received_at)`, `(message_type)`.

This is **append-only**. Every single WebSocket message is stored here. Never deleted during normal operation.

### 7.13 `hand_events`

| Column           | Type      | Constraints                  | Description                    |
|------------------|-----------|------------------------------|--------------------------------|
| id               | serial    | PK                           |                                |
| table_session_id | int       | FK -> table_sessions.id      |                                |
| hand_id          | text      | NOT NULL                     | `roundId` from table server (as string) |
| event_type       | text      | NOT NULL                     | See below                      |
| seat_id          | int       | nullable                     | 0-7 seat index (if applicable) |
| data             | jsonb     | nullable                     | Parsed event data              |
| created_at       | timestamp | DEFAULT now()                |                                |

**Event types stored**:
- `initial_snapshot` -- from InitialData
- `state_update` -- from tableDataUpdated (every stage)
- `hand_ended` -- from tableDataUpdated when stage is 16 or 18
- `round_result` -- from ROUND_RESULT
- `money_deposit_success`, `money_withdraw_success`, `money_player_bet_won`, `money_player_bet_lost`, `money_player_bet_placed`, `money_deposit_req`, `money_withdraw_req`
- `player_status`, `player_online`, `player_offline`, `player_created`

**Indexes**: `(hand_id)`, `(event_type)`.

### 7.14 `hand_results`

| Column           | Type      | Constraints                  | Description                    |
|------------------|-----------|------------------------------|--------------------------------|
| id               | serial    | PK                           |                                |
| table_session_id | int       | FK -> table_sessions.id      |                                |
| hand_id          | text      | NOT NULL                     | `roundId` as string            |
| player_id        | int       | FK -> players.id             |                                |
| seat_id          | int       | NOT NULL                     | 0-7 index from table           |
| net_chips        | float     | NOT NULL                     | winAmount - totalBet           |
| total_bet        | float     | DEFAULT 0                    | Total bet this hand            |
| win_amount       | float     | DEFAULT 0                    | Amount won                     |
| winning_hand     | text      | nullable                     | e.g., "Royal Flush"           |
| is_winner        | boolean   | DEFAULT false                |                                |
| created_at       | timestamp | DEFAULT now()                |                                |

**Indexes**: `(hand_id)`, `(player_id)`.

### 7.15 `scoring_runs`

| Column        | Type      | Constraints              | Description                    |
|---------------|-----------|--------------------------|--------------------------------|
| id            | serial    | PK                       |                                |
| tournament_id | int       | FK -> tournaments.id     |                                |
| hand_id       | text      | NOT NULL                 | Which hand was scored          |
| computed_at   | timestamp | DEFAULT now()            |                                |

### 7.16 `points_ledger`

| Column          | Type      | Constraints              | Description                    |
|-----------------|-----------|--------------------------|--------------------------------|
| id              | serial    | PK                       |                                |
| tournament_id   | int       | FK -> tournaments.id     |                                |
| player_id       | int       | FK -> players.id         |                                |
| hand_id         | text      | NOT NULL                 |                                |
| points_delta    | float     | NOT NULL                 | Points earned/lost this hand   |
| formula_version | text      | DEFAULT 'v1'             | Which formula computed this    |
| created_at      | timestamp | DEFAULT now()            |                                |

**Indexes**: `(tournament_id, player_id)`, `(hand_id)`.

**Default formula (v1)**: `points_delta = net_chips` (i.e., `winAmount - totalBet`).

### 7.17 `leaderboard_snapshots`

| Column        | Type      | Constraints              | Description                    |
|---------------|-----------|--------------------------|--------------------------------|
| id            | serial    | PK                       |                                |
| tournament_id | int       | FK -> tournaments.id     |                                |
| player_id     | int       | FK -> players.id         |                                |
| total_points  | float     | NOT NULL                 | Aggregate points               |
| rank          | int       | NOT NULL                 | 1-based rank                   |
| hands_played  | int       | DEFAULT 0                |                                |
| snapshot_at   | timestamp | DEFAULT now()            |                                |

**Index**: `(tournament_id, rank)`.

### 7.18 `system_health`

| Column            | Type      | Constraints                       | Description                    |
|-------------------|-----------|-----------------------------------|--------------------------------|
| id                | serial    | PK                                |                                |
| table_registry_id | int       | UNIQUE, FK -> tables_registry.id  | One health row per table       |
| ws_status         | WsStatus  | DEFAULT 'disconnected'            | connected/disconnected/error   |
| last_message_at   | timestamp | nullable                          | Last WS message timestamp      |
| reconnect_count   | int       | DEFAULT 0                         | Reconnection attempts          |
| last_error        | text      | nullable                          | Last error message             |
| updated_at        | timestamp | auto-updated                      |                                |

---

## 8. Enums and Allowed Values

| Enum Name          | Values                                              |
|--------------------|-----------------------------------------------------|
| `GameFamily`       | `Poker`, `TeenPatti`                                |
| `PokerVariant`     | `TexasHoldem`, `Omaha`, `Pineapple`                 |
| `LimitType`        | `NoLimit`, `PotLimit`, `TableLimit`                  |
| `TournamentStatus` | `draft`, `active`, `paused`, `completed`, `cancelled`|
| `SeatState`        | `seated`, `sitout`, `surrendered`, `detached`        |
| `WalletTxType`     | `buyin`, `rebuy`, `cashout`, `surrender`, `adjustment`|
| `WsStatus`         | `connected`, `disconnected`, `error`                 |

---

## 9. Wallet Lock State Machine

```
 ┌──────────────────────────────────────────┐
 │              UNLOCKED                     │
 │  (no row in wallet_locks for this wallet) │
 └──────────┬───────────────────────────────┘
            │
            │  onboard / cash-in
            │  (creates wallet_locks row)
            ▼
 ┌──────────────────────────────────────────┐
 │               LOCKED                      │
 │  (row EXISTS in wallet_locks)             │
 │  locked_by = "onboard" | "cashin"         │
 │  table_session_id = <which session>       │
 └──────────┬───────────────────────────────┘
            │
            │  detach / surrender / cash-out
            │  (deletes wallet_locks row)
            ▼
 ┌──────────────────────────────────────────┐
 │              UNLOCKED                     │
 └──────────────────────────────────────────┘
```

**Rules**:
- Attempting to lock an already-locked wallet returns HTTP 409.
- Attempting to unlock a not-locked wallet returns HTTP 400.
- All transitions are wrapped in a Prisma `$transaction` for atomicity.

---

## 10. Scoring Pipeline

```
tableDataUpdated (stage=16/18)
        │
        ▼
  messageParser detects hand_ended
        │
        ▼
  For each playing seat:
    look up seat_assignments by (tableSessionId, seatNumber = seat.id + 1)
    write hand_results row: { netChips = winAmount - totalBet, ... }
        │
        ▼
  scoringEngine.scoreHand(handId, tournamentId, sessionId)
    reads hand_results for this hand
    applies formula: default v1 → points_delta = netChips
    writes scoring_runs row
    writes points_ledger row per player
        │
        ▼
  leaderboardService.getLeaderboard(tournamentId)
    SELECT player_id, SUM(points_delta) ... GROUP BY player_id ORDER BY total DESC
        │
        ▼
  liveUpdates.broadcastLeaderboard(tournamentId, leaderboard)
    sends to all subscribed UIs
```

---

## 11. Session Boundary Logic

When a table is **attached** to a tournament:
1. A new `table_sessions` row is created with `started_at = now()`, `ended_at = null`.
2. All messages received while this session is active are tagged with `table_session_id`.
3. Only `hand_results` linked to this session contribute to scoring.

When a table is **detached**:
1. The session's `ended_at` is set to `now()`.
2. The WebSocket connection to the table is closed.
3. Any further hands on that physical table do NOT count.

**Re-attach**: Creates a brand new session. Old session is closed. No data from the old session bleeds into the new one.

---

## 12. Business Rules and Constraints

| Rule | Enforcement |
|------|-------------|
| Unique screen name (case-insensitive) | DB UNIQUE constraint on `players.screen_name` + app-level case-insensitive check |
| 8 seats max per table | App-level check in onboarding: `COUNT(state='seated') >= 8 → 409` |
| Minimum 3 players to start | App-level: `GET /seats` returns `canStart: seatedCount >= 3` (UI disables start button) |
| Single active tournament per player | DB UNIQUE constraint on `(player_id, active_accrual=true)` in `tournament_registrations` + app-level check |
| Wallet locked while seated | `wallet_locks` UNIQUE on `wallet_account_id`; lock on onboard, unlock on detach |
| Cannot delete active tournament | App returns 400 unless `?force=true` query param |
| Seat number range | App validates `1 <= seatNumber <= 8` before DB write |
| Detached table = cash game | Session closed on detach; no `hand_results` or `points_ledger` entries written for closed sessions |

---

## 13. What Game-Side Engineers Need to Build / Change

### Currently Working (No Game Changes Needed)

The tournament server already:
- Connects to the existing `/holdem/wsclient/admin` endpoint
- Parses `InitialData`, `tableDataUpdated`, `ROUND_RESULT`, money messages, player messages
- Stores all raw messages and computes scoring

### Possible Game-Side Enhancements (Optional)

These are **not required** for the tournament module to function, but would improve the integration:

| Enhancement | Why | Details |
|-------------|-----|---------|
| **Add `tournamentMode` flag to table config** | Lets the table know it's in tournament mode | Already exists in `configData.tournamentMode` -- ensure it's settable via admin WS |
| **Table reset endpoint** | Let tournament server trigger a clean reset on attach | `POST /holdem/reset` or a WS message `{ "MessageType": "RESET_TABLE" }`. Currently we use session boundaries instead. |
| **Include player UID in seat data** | Better player matching | `seat.uid` already exists. Ensure it's a stable, unique identifier that matches across sessions. |
| **Broadcast `HAND_STARTED` event** | More precise hand boundary detection | Currently we infer from stage transitions (4 = hole cards dealt). An explicit `HAND_STARTED` with `roundId` would be cleaner. |
| **Include `screenName` in seat data** | Direct player resolution without DB lookup | Currently `seat.name` is used but may differ from the tournament `screen_name`. Adding `screenName` from tournament registration would simplify matching. |
| **Consistent `roundId` typing** | Prevent string/number mismatches | The table sends `roundId` as `Long` (number). Tournament DB stores it as `String`. Ideally both use string. |

### Seat Index Mapping

**Table server**: seats are 0-indexed (0-7).
**Tournament DB**: `seat_assignments.seat_number` is 1-indexed (1-8).

Mapping: `tournament_seat = table_seat + 1`

This is handled automatically in the tournament server's hand result processing. Game-side code does not need to change.

---

## Appendix: Quick Reference Card

```
Tournament Server:     http://localhost:4000
Frontend:              http://localhost:4001
Database:              postgresql://tournament:tournament@localhost:5433/tournament_db
Live WS:               ws://localhost:4000/ws/live

Table WS endpoint:     ws://<table-ip>:<port>/holdem/wsclient/admin
Init message:          {"MessageType":"INITIALIZE_ADMIN"}
Hand-end detection:    tableDataUpdated where data.stage === "16" || "18"
Scoring formula (v1):  points_delta = seat.winAmount - seat.totalBet
```
