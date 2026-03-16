# Predicta Tournament — UI/UX Design Documentation
**Version:** 1.0
**Designer:** Senior UI/UX
**Font:** VoldaSans
**Theme:** Professional Dark · Gaming Identity Standard

---

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Design System](#design-system)
3. [Screen Inventory](#screen-inventory)
4. [User Flows](#user-flows)
5. [Wireframes — All 14 Screens](#wireframes)
6. [Component Library](#component-library)
7. [Questions / Open Items](#questions)

---

## 1. Design Philosophy

> **"Precision. Power. Clarity."**
> A professional tournament system used by staff, dealers, and players in a real casino-style LAN environment. The design must feel authoritative yet approachable — like a Bloomberg terminal but for card games.

**Core Principles:**
- **Dark & Focused** — Deep background eliminates distraction during high-stakes play
- **Green as Signal** — `#37FF7D` is reserved for live status, success, and primary actions. Never decorative.
- **Hierarchy First** — Important information is large and bright. Secondary info recedes into muted tones.
- **Data-Dense but Breathable** — Tables and stats are compact but never cramped. Consistent 8px grid.
- **Role-Specific Clarity** — Admin sees command-level data. Dealer sees operational controls. Player sees only what they need.

---

## 2. Design System

### 2.1 Color Palette

```
BASE COLORS
────────────────────────────────────────
Background Base      #030A06    ██  Deepest black-green. Page/app background.
Background Card      #0A1A0F    ██  Card surfaces, sidebars, top bars.
Background Elevated  #0F2218    ██  Hover states, nested panels, table headers.
Background Hover     #142B1E    ██  Interactive hover state.

BORDER COLORS
────────────────────────────────────────
Border Standard      #1A3A26    ──  Card borders, dividers.
Border Subtle        #0D1F14    ──  Row separators, inner dividers.

BRAND / ACCENT
────────────────────────────────────────
Primary Green        #37FF7D    ██  CTA buttons, active state, LIVE indicator, points.
Green Dim            rgba(55,255,125, 0.10)   ██  Icon backgrounds, active nav bg.
Green Glow           rgba(55,255,125, 0.20)   ██  Glow effects on key cards.

GAME FAMILY COLORS
────────────────────────────────────────
Poker Blue           #47B8FF    ██  Poker tag, poker-related data accent.
Teen Patti Gold      #FFB547    ██  Teen Patti tag, gold accent.

SEMANTIC COLORS
────────────────────────────────────────
Success              #37FF7D    ██  Wallet unlocked, connected, approved.
Warning              #FFB547    ██  Sitting out, scheduled, pending.
Error / Alert        #FF4747    ██  Offline, locked wallet, error state.
Info                 #47B8FF    ██  Information, neutral status.

TEXT COLORS
────────────────────────────────────────
Text Primary         #FFFFFF       Main headings, values, player names.
Text Secondary       #8BA89A       Supporting labels, descriptions.
Text Muted           #4A6B57       Timestamps, sub-labels, nav section titles.
Text On Green        #030A06       Text displayed ON the green button/badge.
```

### 2.2 Typography

```
FONT FAMILY: VoldaSans
Fallback Stack: 'Rajdhani', 'Exo 2', system-ui, sans-serif

SCALE
────────────────────────────────────────────────────
Display    48px  700  Letter-spacing: -0.5px   TV Leaderboard rank numbers
H1         32px  700  Letter-spacing: -0.3px   Stat card values, page titles
H2         24px  700  Letter-spacing: 0px      Section headings
H3         18px  700  Letter-spacing: 0.3px    Card titles, player names
H4         16px  600  Letter-spacing: 0.3px    Table column headers
Body       14px  400  Letter-spacing: 0.2px    General content, descriptions
Small      12px  500  Letter-spacing: 0.5px    Tags, badges, meta info
Micro      10px  600  Letter-spacing: 1.0px    Nav labels, status uppercase text
────────────────────────────────────────────────────

All uppercase text uses letter-spacing: 1.0–1.5px
Number/stat values always use font-weight: 700
```

### 2.3 Spacing System (8px Grid)

```
4px    xs     Tight inline gaps (icon + label)
8px    sm     Inner padding small, gap between elements
12px   md     Card inner padding, row padding
16px   lg     Standard gap, section padding
20px   xl     Card padding
24px   2xl    Content area padding, section gaps
32px   3xl    Large section separators
48px   4xl    Page-level spacing
```

### 2.4 Border Radius

```
4px    Tags, badges, small chips
6px    Action buttons, small icon buttons
8px    Input fields, medium buttons
10px   Icon containers
12px   Cards, panels, modals
16px   Large cards, modal containers
20px   Kiosk-style large cards
```

### 2.5 Elevation / Shadow

```
Level 1 (Card)    : border 1px #1A3A26
Level 2 (Modal)   : border 1px #1A3A26 + shadow 0 8px 32px rgba(0,0,0,0.6)
Level 3 (Overlay) : border 1px #37FF7D (green) for focused/selected state
Glow Effect       : box-shadow 0 0 20px rgba(55,255,125,0.15) — used on LIVE cards
```

### 2.6 Status Indicator System

```
● LIVE        Green dot (animated pulse) + "LIVE" text    → Table attached + playing
● SCHEDULED   Blue dot + "SCHEDULED"                      → Tournament scheduled
● IDLE        Yellow dot + "IDLE"                         → Table attached, waiting
● SITTING OUT Yellow dot + "SITTING OUT"                  → Player paused
● OFFLINE     Red dot + "OFFLINE"                         → Table disconnected
● LOCKED      Red icon + "LOCKED"                         → Wallet is locked
● UNLOCKED    Green icon + "UNLOCKED"                     → Wallet is free
● CASH GAME   Muted dot + "CASH GAME"                     → Table not in tournament
```

---

## 3. Screen Inventory

| # | Screen Name | User Role | Device | Priority |
|---|-------------|-----------|--------|----------|
| 01 | Admin Command Center | Super-Admin | Desktop 1440px | P0 |
| 02 | Tournament Creation Wizard | Super-Admin | Desktop 1440px | P0 |
| 03 | Tournament Detail & Table Mgmt | Super-Admin | Desktop 1440px | P0 |
| 04 | Player Management Directory | Super-Admin | Desktop 1440px | P1 |
| 05 | Leaderboard Analytics | Super-Admin | Desktop 1440px | P1 |
| 06 | Dealer Dashboard | Dealer | Tablet 1024×768 | P0 |
| 07 | Table Seating View (8 seats) | Dealer | Tablet 1024×768 | P0 |
| 08 | Player Onboarding Flow | Dealer | Tablet 1024×768 | P0 |
| 09 | Buy-in / Rebuy Panel | Dealer | Tablet 1024×768 | P0 |
| 10 | Player Registration Kiosk | Player | Kiosk 1080×1920 | P0 |
| 11 | Player Landing Screen | Player | Tablet 1024×768 | P0 |
| 12 | TV / Projector Leaderboard | Public | 1920×1080 | P0 |
| 13 | Table Topper Display | Public | 1280×800 | P1 |
| 14 | System Settings | Super-Admin | Desktop 1440px | P2 |

---

## 4. User Flows

### Flow A — Super-Admin Event Day
```
Login → Admin Dashboard
  → Create Tournament (Wizard: Name + Game + Dates)
  → Attach Tables (from available table list)
  → Monitor live: Dashboard shows health, live leaderboard
  → Projector Display: Cast TV screen to projector
  → Manage Players: View directory, search, export
```

### Flow B — Dealer Table Setup
```
Login → Dealer Dashboard
  → See: Table status (Cash Game or Tournament)
  → Attach Table to Tournament (select tournament from dropdown)
    → System auto-resets table data
  → Table Seating View: 8 empty seats
  → For each player arriving:
      Player taps Landing Screen → enters screen name
      → Dealer sees request → Player Onboarding Flow
      → Search screen name → Assign seat → Enter buy-in amount
      → Submit → Server confirms → Seat is LOCKED
  → Start Game button activates when 3+ players seated
```

### Flow C — Player Registration
```
Walk to Registration Kiosk
→ Enter: First Name, Last Name, Email, Phone (optional)
→ Choose Screen Name (real-time uniqueness check)
→ Preview badge
→ Confirm → Badge prints
→ Walk to table
```

### Flow D — Player Table Switch
```
Active at Table A
→ Ask Dealer to Detach
→ Dealer: Seat action → Detach player
→ System: Wallet UNLOCKED
→ Player walks to Table B
→ Table B Landing Screen → Enter screen name
→ Dealer onboards at new table
→ System: Wallet LOCKED again
```

---

## 5. Wireframes — All 14 Screens

---

### SCREEN 01 — Admin Command Center Dashboard
**Device:** Desktop 1440px | **Role:** Super-Admin

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: [P] PREDICTA TOURNAMENT    ● LIVE — 3 Tournaments Active           [⚙][👤]│
├────────────┬────────────────────────────────────────────────────────────────────┤
│            │  Dashboard   ▲ Feb 26, 2026                    [+ New Tournament]  │
│  SIDEBAR   ├────────────────────────────────────────────────────────────────────┤
│            │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│ [P]Predicta│  │ACTIVE    │ │LIVE      │ │REGISTERED│ │HANDS     │             │
│  Tournament│  │TOURNAMENTS│ │TABLES   │ │PLAYERS   │ │TODAY     │             │
│            │  │    3     │ │   12    │ │   247   │ │  1,840  │             │
│ ──────── │  │  ↑ 1 new │ │ 8/12 on │ │ +14 today│ │ +320/hr │             │
│ MAIN      │  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
│ ● Dashboard│  ┌──────────────────────────────────────┐ ┌──────────────────────┐│
│   Tournaments│ │ ACTIVE TOURNAMENTS                  │ │ TABLE HEALTH         ││
│   Players  │  │ [ALL] [POKER] [TEEN PATTI]          │ │ ┌────────┐ ┌────────┐││
│   Tables   │  │─────────────────────────────────────│ │ │TBL-01  │ │TBL-02  │││
│   Settings │  │ # NAME       GAME  TABLES PLY  STATUS│ │ ● LIVE │ │ ● LIVE │││
│            │  │ 1 Grand Poker Hold'em  4    82  LIVE │ │ 8/8 🔒 │ │ 7/8    │││
│ DISPLAY   │  │ 2 TP Classic Classic   6   103  LIVE │ │ 342/hr │ │ 289/hr │││
│   Projector│  │ 3 Poker Pro  Omaha    2    62  LIVE │ └────────┘ └────────┘││
│   Leaderboard│ │──────────────────────────────────────│ ┌────────┐ ┌────────┐││
│            │  │ 4 Weekend TP 7-Card   —    —  SCHED │ │ TBL-03 │ │ TBL-04 │││
│ SYSTEM    │  │ 5 Pineapple  Pinep.   —    —  SCHED │ │ ● LIVE │ │ ● IDLE │││
│   Settings │  └──────────────────────────────────────┘ │ 6/8    │ │ 3/8    │││
│   Logs     │                                            │ 198/hr │ │ —      │││
│            │  ┌──────────────────────────────────────┐ └────────┘ └────────┘││
│            │  │ TOP 5 LEADERBOARD  (Grand Poker)    ▼│ ┌──────────────────────┘│
│            │  │ # PLAYER        TABLE    POINTS      │ │ RECENT ACTIVITY       │
│            │  │ 🥇 ShadowAce    TBL-03   14,820      │ │ ● Player "ShadowAce"  │
│            │  │ 🥈 NightFold    TBL-01   13,445      │ │   rebuyed at TBL-03   │
│            │  │ 🥉 BluffKing    TBL-02   12,100      │ │   2 min ago           │
│            │  │  4 CardShark    TBL-01   11,780      │ │ ● TBL-04 attached to  │
│            │  │  5 RiverBoss    TBL-04   10,990      │ │   Grand Poker 5min ago│
│            │  └──────────────────────────────────────┘ │ ● New player "Kings"  │
│            │                                            │   registered 8min ago │
└────────────┴────────────────────────────────────────────────────────────────────┘
```

**Key Elements:**
- Sidebar: 240px, dark, nav with role-based sections
- 4 KPI stat cards with live counters and trend indicators
- Tournament list table with filter tabs (All / Poker / Teen Patti)
- Right panel: Table health grid (4 per visible area, scrollable)
- Right panel: Live leaderboard preview (top 5, filterable by tournament)
- Right panel: Activity feed (real-time event log)
- Top bar: Global live indicator, date, quick actions

---

### SCREEN 02 — Tournament Creation Wizard
**Device:** Desktop 1440px | **Role:** Super-Admin

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back to Dashboard        Create New Tournament             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Step 1 of 3 ──●───────○───────○                          │
│              BASICS    GAME    SCHEDULE                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │  Tournament Name *                                   │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │  Grand Poker Championship                      │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │  Tournament ID: TRN-2026-0044 (auto-generated)      │   │
│  │                                                      │   │
│  │  Game Family *                                       │   │
│  │  ┌──────────────────┐  ┌──────────────────┐        │   │
│  │  │  ♠ POKER         │  │  🃏 TEEN PATTI   │        │   │
│  │  │  [SELECTED]      │  │                  │        │   │
│  │  └──────────────────┘  └──────────────────┘        │   │
│  │                                                      │   │
│  │  Description (optional)                              │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │  ...                                           │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                          [Next: Game Rules →]│
└──────────────────────────────────────────────────────────────┘

STEP 2 — GAME RULES:
  Variant selector (Texas Hold'em / Omaha / Pineapple for Poker)
            (Classic / Muflis / AK47 / 999 / etc for Teen Patti)
  Bet Type  (Table Limit / Pot Limit / No Limit)
  Min Players per table: [3] (locked at 3, from requirements)
  Max Players per table: [8] (locked at 8, from requirements)

STEP 3 — SCHEDULE:
  Start Date + Time picker
  End Date + Time picker OR [Open-Ended toggle]
  Review summary card → [Create Tournament]
```

**Key Elements:**
- 3-step progress indicator at top
- Card-based form container, centered max 680px
- Game Family as large selectable cards (not dropdowns)
- Variants shown only after game family selected (conditional)
- Auto-generated Tournament ID shown (read-only)
- Clear back/next navigation

---

### SCREEN 03 — Tournament Detail & Table Management
**Device:** Desktop 1440px | **Role:** Super-Admin

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Tournaments  /  Grand Poker Championship                         │
│                   TRN-2026-0044  ● LIVE  [Edit] [Force Delete]     │
├────────────────────────────────────┬───────────────────────────────┤
│                                    │                               │
│  TOURNAMENT INFO                   │  ATTACH TABLE                 │
│  Game:  Texas Hold'em · No Limit   │  ┌─────────────────────────┐ │
│  Start: Feb 26, 2026 · 18:00       │  │ Search available tables │ │
│  End:   Open-ended                 │  │ [TBL-05 ▼]              │ │
│  Tables: 4 attached                │  │ [Attach to Tournament]  │ │
│  Players: 82 active                │  └─────────────────────────┘ │
│                                    │                               │
│  ATTACHED TABLES                   │  AVAILABLE TABLES             │
│  ┌──────────────────────────────┐  │  ┌──────────────────────────┐│
│  │ TABLE  PLAYERS  STATUS  HPH  │  │  │ TBL-05  ○ Cash Game      ││
│  │ TBL-01  8/8   ● LIVE  342  [✕]│  │  │ TBL-07  ○ Cash Game      ││
│  │ TBL-02  7/8   ● LIVE  289  [✕]│  │  │ TBL-09  ○ Cash Game      ││
│  │ TBL-03  6/8   ● LIVE  198  [✕]│  │  └──────────────────────────┘│
│  │ TBL-04  3/8   ● IDLE   —   [✕]│  │                               │
│  └──────────────────────────────┘  │  REMOVE TABLE                  │
│                                    │  Click [✕] next to table       │
│  LIVE LEADERBOARD                  │  to detach. Game data is       │
│  ┌──────────────────────────────┐  │  preserved but no new points   │
│  │ # PLAYER   TABLE  PTS  HANDS │  │  are scored.                  │
│  │ 1 ShadowAce TBL-03 14820  88│  │                               │
│  │ 2 NightFold TBL-01 13445  72│  └───────────────────────────────┘
│  │ 3 BluffKing TBL-02 12100  91│
│  └──────────────────────────────┘
└────────────────────────────────────┘
```

---

### SCREEN 04 — Player Management Directory
**Device:** Desktop 1440px | **Role:** Super-Admin

```
┌─────────────────────────────────────────────────────────────────┐
│  Player Management                   [+ Register Player] [Export]│
│  247 registered · 192 active · 55 idle                          │
├─────────────────────────────────────────────────────────────────┤
│  [Search by name or screen name...]   [Status ▼] [Tournament ▼] │
├──────┬────────────────┬──────────────┬────────────┬─────────────┤
│  #   │ REAL NAME      │ SCREEN NAME  │ WALLET     │ STATUS      │
├──────┼────────────────┼──────────────┼────────────┼─────────────┤
│  1   │ Arjun Mehta    │ ShadowAce    │ 🔒 LOCKED  │ ● PLAYING   │
│      │ arjun@m.com    │              │ TBL-03     │             │
├──────┼────────────────┼──────────────┼────────────┼─────────────┤
│  2   │ Priya Sharma   │ NightFold    │ 🔒 LOCKED  │ ● PLAYING   │
│      │ priya@s.com    │              │ TBL-01     │             │
├──────┼────────────────┼──────────────┼────────────┼─────────────┤
│  3   │ Rahul Das      │ BluffKing    │ 🔓 UNLOCKED│ ○ IDLE      │
│      │ rahul@d.com    │              │ —          │             │
└──────┴────────────────┴──────────────┴────────────┴─────────────┘
  [< 1  2  3 ... 32 >]                     Showing 1-10 of 247
```

---

### SCREEN 05 — Leaderboard Analytics
**Device:** Desktop 1440px | **Role:** Super-Admin

```
┌────────────────────────────────────────────────────────────────┐
│  Leaderboard Analytics            [Tournament ▼] [Export CSV]  │
│  Grand Poker Championship · 82 players · 1,840 hands played    │
├────────────────────────────────────────────────────────────────┤
│  RANK  PLAYER       SCREEN  TABLE  HANDS  WINS  POINTS  CHANGE │
│  ──────────────────────────────────────────────────────────────│
│  🥇 1  Arjun M.    ShadowAce TBL-3   88    32   14,820   ──   │
│  🥈 2  Priya S.    NightFold  TBL-1   72    24   13,445  ▲ +1  │
│  🥉 3  Rahul D.    BluffKing  TBL-2   91    28   12,100  ▼ -1  │
│      4  Karan T.   CardShark  TBL-1   65    19   11,780   ──   │
│      5  Divya P.   RiverBoss  TBL-4   58    17   10,990  ▲ +2  │
│  ...                                                           │
└────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 06 — Dealer Dashboard
**Device:** Tablet 1024×768 | **Role:** Dealer

```
┌────────────────────────────────────────────────────────┐
│  TABLE TBL-03          ● LIVE · Grand Poker     [⚙]   │
│  Texas Hold'em · No Limit                              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ 6 / 8        │ │  1,840       │ │  #1 RANKING  │  │
│  │ PLAYERS      │ │  HANDS TODAY │ │  THIS TABLE  │  │
│  └──────────────┘ └──────────────┘ └──────────────┘  │
│                                                        │
│  QUICK ACTIONS                                         │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │ + ONBOARD PLAYER │  │  ⏸ START / PAUSE │          │
│  │  (search name)   │  │     GAME         │          │
│  └──────────────────┘  └──────────────────┘          │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │ SEAT  PLAYER      STATUS       CHIPS   ACTION  │  │
│  │  1    ShadowAce   ● PLAYING   ₹2,400  [•••]   │  │
│  │  2    NightFold   ● PLAYING   ₹1,850  [•••]   │  │
│  │  3    BluffKing   ⏸ SIT OUT   ₹3,200  [•••]   │  │
│  │  4    CardShark   ● PLAYING   ₹ 900   [•••]   │  │
│  │  5    —           ○ EMPTY      —     [+ ADD]   │  │
│  │  6    RiverBoss   ● PLAYING   ₹1,100  [•••]   │  │
│  │  7    —           ○ EMPTY      —     [+ ADD]   │  │
│  │  8    —           ○ EMPTY      —     [+ ADD]   │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ⚠️ Min 3 players required. [Start Game] — 6 ready   │
└────────────────────────────────────────────────────────┘
```

---

### SCREEN 07 — Table Seating View (8 Seats)
**Device:** Tablet 1024×768 | **Role:** Dealer

```
┌──────────────────────────────────────────────────────────┐
│  TBL-03  Texas Hold'em · No Limit  ● LIVE               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│           [SEAT 1]        [SEAT 2]        [SEAT 3]       │
│         ShadowAce        NightFold           ——         │
│         ₹2,400          ₹1,850           [EMPTY]       │
│         ● Playing        ● Playing        [+ ADD]       │
│                                                          │
│   [SEAT 8]  ┌─────────────────────────┐  [SEAT 4]       │
│  ——         │   ♠ POKER TABLE         │  CardShark      │
│  [EMPTY]    │   TX HOLD'EM · NL       │  ₹900          │
│  [+ ADD]    │   Hand #144             │  ● Playing      │
│             └─────────────────────────┘                  │
│   [SEAT 7]                               [SEAT 5]       │
│   ——                                    RiverBoss      │
│   [EMPTY]                               ₹1,100         │
│   [+ ADD]                               ● Playing      │
│                                                          │
│           [SEAT 6]                                      │
│         BluffKing                                       │
│         ₹3,200                                          │
│         ⏸ Sit Out                                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

### SCREEN 08 — Player Onboarding Flow
**Device:** Tablet 1024×768 | **Role:** Dealer

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Table     Onboard Player to Seat 5            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SEARCH PLAYER BY SCREEN NAME                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🔍 Type screen name...                           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  RESULTS:                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ✓ RiverBoss     Divya P.    🔓 UNLOCKED  [SELECT]│  │
│  │ ○ RiverFish     Amit K.     🔒 LOCKED    (N/A)   │  │
│  │ ○ RiverDeep     Sonal R.    🔓 UNLOCKED  [SELECT]│  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  SELECTED: RiverBoss (Divya P.)    Wallet: 🔓 UNLOCKED │
│                                                         │
│  BUY-IN AMOUNT                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ₹  [  1,000                                   ]  │  │
│  └──────────────────────────────────────────────────┘  │
│  Quick: [₹500]  [₹1,000]  [₹2,000]  [₹5,000]          │
│                                                         │
│  SEAT: 5 of 8          TABLE: TBL-03                    │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  ⏳ Confirming with Tournament Server...       │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  [Cancel]                        [Confirm Onboarding]   │
└─────────────────────────────────────────────────────────┘
```

**Key Interactions:**
- Server confirmation banner appears (loading state) before seat is finalized
- Locked wallet players show "N/A" — cannot be selected
- Confirmation button is disabled until server responds with success

---

### SCREEN 09 — Buy-in / Rebuy / Seat Action Panel
**Device:** Tablet 1024×768 | **Role:** Dealer
*(Appears as a bottom sheet or modal over the table view)*

```
┌────────────────────────────────────────────────────────┐
│  Seat 1 — ShadowAce (Arjun M.)                        │
│  ● Playing   Chips: ₹2,400   Points: 14,820            │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  REBUY   │ │ SIT OUT  │ │ DETACH   │ │SURRENDER │ │
│  │  + Chips │ │  Pause   │ │  Leave   │ │  Cash Out│ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                        │
│  [If REBUY selected]:                                  │
│  ┌────────────────────────────────────────────────┐   │
│  │  Rebuy Amount: ₹ [1,000]                       │   │
│  │  Quick: [₹500] [₹1,000] [₹2,000]              │   │
│  │  [Confirm Rebuy]                               │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  ⚠️ DETACH will unlock wallet and end tournament scoring│
│                                                        │
│                                  [Close]               │
└────────────────────────────────────────────────────────┘
```

---

### SCREEN 10 — Player Registration Kiosk
**Device:** Kiosk/Tablet Portrait 1080×1920 | **Role:** Player (self-service)

```
┌────────────────────────────────┐
│                                │
│   [P] PREDICTA TOURNAMENT      │
│   Welcome to the Event         │
│                                │
│   REGISTER TO PLAY             │
│                                │
│   First Name *                 │
│   ┌────────────────────────┐   │
│   │ Arjun                  │   │
│   └────────────────────────┘   │
│                                │
│   Last Name *                  │
│   ┌────────────────────────┐   │
│   │ Mehta                  │   │
│   └────────────────────────┘   │
│                                │
│   Email *                      │
│   ┌────────────────────────┐   │
│   │ arjun@email.com        │   │
│   └────────────────────────┘   │
│                                │
│   Phone (optional)             │
│   ┌────────────────────────┐   │
│   │ +91 ...                │   │
│   └────────────────────────┘   │
│                                │
│   Choose Screen Name *         │
│   ┌────────────────────────┐   │
│   │ ShadowAce              │   │
│   └────────────────────────┘   │
│   ✓ Available                  │
│                                │
│   ┌────────────────────────┐   │
│   │    BADGE PREVIEW       │   │
│   │  ┌──────────────────┐  │   │
│   │  │  ARJUN MEHTA     │  │   │
│   │  │  @ ShadowAce     │  │   │
│   │  └──────────────────┘  │   │
│   └────────────────────────┘   │
│                                │
│   [    REGISTER & PRINT BADGE ]│
│                                │
│   Already registered?          │
│   [Search by screen name →]    │
└────────────────────────────────┘
```

---

### SCREEN 11 — Player Landing Screen (At Table)
**Device:** Tablet at table | **Role:** Player-facing

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   [P] PREDICTA TOURNAMENT                            │
│   TABLE TBL-03 · Texas Hold'em · No Limit            │
│                                                      │
│                ♠  TAKE A SEAT  ♠                     │
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │  🔍 Enter your Screen Name                   │  │
│   │                                              │  │
│   │  [ShadowAce                               ]  │  │
│   └──────────────────────────────────────────────┘  │
│                                                      │
│   Or tap your name:                                  │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐     │
│   │  ShadowAce │ │  NightFold │ │  RiverBoss │     │
│   └────────────┘ └────────────┘ └────────────┘     │
│                                                      │
│         [  NOTIFY DEALER TO SEAT ME  ]               │
│                                                      │
│   ⚠️  Your dealer will confirm your seat.            │
│       Please wait after tapping.                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### SCREEN 12 — TV / Projector Leaderboard Display
**Device:** 1920×1080 TV/Projector | **Role:** Public / All Players

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [P] PREDICTA TOURNAMENT          GRAND POKER CHAMPIONSHIP              ● LIVE   19:42 │
│ Texas Hold'em · No Limit                                     82 Players · 1,840 Hands │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   TOURNAMENT LEADERBOARD                                    TABLE STATUS             │
│                                                                                      │
│   RANK  SCREEN NAME    TABLE    HANDS   POINTS              ┌──────┬──────┬──────┐  │
│   ─────────────────────────────────────────                 │TBL-01│TBL-02│TBL-03│  │
│   🥇 1  ShadowAce      TBL-03    88    14,820  ████████    │ ●    │ ●    │ ●    │  │
│   🥈 2  NightFold       TBL-01    72    13,445  ███████     │ 8/8  │ 7/8  │ 6/8  │  │
│   🥉 3  BluffKing       TBL-02    91    12,100  ██████      ├──────┼──────┼──────┤  │
│      4  CardShark       TBL-01    65    11,780  ██████      │TBL-04│TBL-05│TBL-06│  │
│      5  RiverBoss       TBL-04    58    10,990  █████       │ ●    │ ●    │ ●    │  │
│      6  AceDeep         TBL-02    77    10,450  █████       │ 3/8  │ 8/8  │ 5/8  │  │
│      7  KingBluff       TBL-03    69     9,800  █████       └──────┴──────┴──────┘  │
│      8  PokerFace       TBL-01    54     9,100  ████                                 │
│      9  DarkHorse       TBL-05    82     8,750  ████        LAST HAND WINNER         │
│     10  RoyalFlush      TBL-06    61     8,200  ████        🏆 ShadowAce             │
│                                                             TBL-03 · Hand #144       │
│   [ View Full Standings →  82 players total ]               +320 pts                 │
│                                                                                      │
│ ● Updates every hand                                        Powered by PREDICTA      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

### SCREEN 13 — Table Topper Display
**Device:** 1280×800 physical table screen | **Role:** Public / Players at table

```
┌──────────────────────────────────────────────────────────┐
│  TBL-03                        ● LIVE TOURNAMENT         │
│  GRAND POKER CHAMPIONSHIP                                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   GAME          VARIANT         RULESET                  │
│   POKER         TEXAS HOLD'EM   NO LIMIT                 │
│                                                          │
│   ┌──────────────────────────────────────────────────┐  │
│   │  CURRENT TABLE STANDINGS                        │  │
│   │  # PLAYER       POINTS   HANDS                  │  │
│   │  1 ShadowAce    14,820    88                    │  │
│   │  2 BluffKing    12,100    91                    │  │
│   │  3 RiverBoss    10,990    58                    │  │
│   └──────────────────────────────────────────────────┘  │
│                                                          │
│   6 players seated  ·  Hand #144  ·  Game in progress   │
└──────────────────────────────────────────────────────────┘
```

---

### SCREEN 14 — System Settings & Configuration
**Device:** Desktop 1440px | **Role:** Super-Admin

```
┌────────────────────────────────────────────────────────┐
│  System Settings                                        │
├────────────────────────────────────────────────────────┤
│  SECTIONS:  [General] [Network] [Tables] [Display] [Logs]
│                                                        │
│  [General]:                                            │
│  Event Name: [Predicta Grand Cup 2026]                 │
│  Venue: [The Grand Casino, Mumbai]                     │
│  Admin Password: [Change Password]                     │
│                                                        │
│  [Network]:                                            │
│  Tournament Server IP: [192.168.1.100]                 │
│  Subnet Mask: [255.255.255.0]                          │
│  WebSocket Port: [8080]                                │
│                                                        │
│  [Tables]:                                             │
│  List of registered tables + URL + last seen status    │
│  [+ Add Table URL]                                     │
│                                                        │
│  [Display]:                                            │
│  Projector refresh rate: [Real-time / 5s / 10s]       │
│  Leaderboard theme: [Dark ✓ / Light]                  │
└────────────────────────────────────────────────────────┘
```

---

## 6. Component Library

### Button Variants
```
[PRIMARY]     Background: #37FF7D  Text: #030A06  — Main CTA actions
[SECONDARY]   Background: transparent  Border: #1A3A26  Text: #8BA89A
[DANGER]      Background: transparent  Border: #FF4747  Text: #FF4747
[GHOST]       No border, text only, #8BA89A → hover #FFFFFF
```

### Input Fields
```
Background: #0F2218
Border: 1px solid #1A3A26
Border (focus): 1px solid #37FF7D + glow
Text: #FFFFFF
Placeholder: #4A6B57
Border Radius: 8px
Padding: 12px 16px
```

### Status Badges
```
● LIVE         Green bg-dim  · #37FF7D text  · animated dot
● SCHEDULED    Blue bg-dim   · #47B8FF text
⏸ IDLE         Yellow bg-dim · #FFB547 text
○ OFFLINE      Red bg-dim    · #FF4747 text
🔒 LOCKED       Red bg-dim    · #FF4747 text
🔓 UNLOCKED     Green bg-dim  · #37FF7D text
```

### Game Family Tags
```
[POKER]      Blue: border #47B8FF, text #47B8FF, bg rgba(71,184,255,0.1)
[TEEN PATTI] Gold: border #FFB547, text #FFB547, bg rgba(255,181,71,0.1)
```

### Card Component
```
Background: #0A1A0F
Border: 1px solid #1A3A26
Border Radius: 12px
Padding: 20px
Hover: border-color → #37FF7D (on interactive cards)
```

### Navigation
```
Sidebar width: 240px
Nav item height: 40px
Active: bg #37FF7D·10%, text #37FF7D, left border 3px #37FF7D
Hover: bg #142B1E, text #FFFFFF
Section label: 10px, #4A6B57, uppercase, 1.5px letter-spacing
```

---

## 7. Confirmed Specifications ✅

| # | Question | Confirmed Answer |
|---|----------|-----------------|
| 1 | Dealer Device | **Tablet — 1200×1920 portrait, touch-optimized** |
| 2 | TV Projector | **1920×1080 only** |
| 3 | Teen Patti 7 Variants | **THREE_CARD · TWO_CARD · FOUR_CARD · MUFLIS · JOKER · ZHANDU · FLIPPER** |
| 4 | Currency Symbol | **$ Dollar** |
| 5 | Mobile Phone | **Out of scope — Tablet/Desktop/Kiosk/TV only** |
| 6 | Badge Print Size | **A6 (148mm × 105mm)** |

### Teen Patti Variants Reference
```
THREE_CARD   Standard 3-card game
TWO_CARD     2-card variant
FOUR_CARD    4-card variant
MUFLIS       Lowball / reverse scoring
JOKER        Joker wildcard variant
ZHANDU       Zhandu variant
FLIPPER      Flipper variant
```

### Device Specifications Summary
```
Admin Dashboard     Desktop      1440px × 900px min     Cursor-based
TV Leaderboard      TV/Projector 1920×1080               Display only (no interaction)
Dealer Dashboard    Tablet       1200×1920 portrait      Touch — min 48px targets
Player Kiosk        Kiosk/Tablet 1200×1920 portrait      Touch — min 56px targets
Player Landing      Tablet       1200×1920 portrait      Touch — min 56px targets
Badge Print         Print        A6 (148×105mm)          Physical print artifact
```

---

## 8. Screen Build Progress

| # | Screen | Status | File |
|---|--------|--------|------|
| 01 | Admin Command Center | ✅ Complete | screens/01_Admin_Dashboard.html |
| 02 | Tournament Creation Wizard | ⏳ Pending | — |
| 03 | Tournament Detail & Table Mgmt | ⏳ Pending | — |
| 04 | Player Management Directory | ⏳ Pending | — |
| 05 | Leaderboard Analytics | ⏳ Pending | — |
| 06 | Dealer Dashboard | ✅ Complete | screens/06_Dealer_Dashboard.html |
| 07 | Table Seating View | ⏳ Pending | — |
| 08 | Player Onboarding Flow | ⏳ Pending | — |
| 09 | Buy-in / Rebuy Panel | ⏳ Pending | — |
| 10 | Player Registration Kiosk | ⏳ Pending | — |
| 11 | Player Landing Screen | ⏳ Pending | — |
| 12 | TV / Projector Leaderboard | ✅ Complete | screens/02_TV_Leaderboard.html |
| 13 | Table Topper Display | ⏳ Pending | — |
| 14 | System Settings | ⏳ Pending | — |

---

*Documentation Version 1.1 — Specs confirmed. Screens being built in priority order.*
