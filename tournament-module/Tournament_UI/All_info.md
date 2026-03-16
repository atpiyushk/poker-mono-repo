Consolidated System Requirements
1 System Architecture &amp; Infrastructure
 Passive Integration: The Tournament Module must have minimal impact on the
existing Poker Game implementation. It should function as a passive reader of
messages from the Poker server to implement its functionality.
 Network Setup: The system operates on a LAN. Each physical table has a dedicated
&quot;poker server&quot; running on a sub-LAN that serves the tablets at that table.
 Tournament Server: There is a single centralized &quot;Tournament Server&quot; on the LAN.
 Connectivity: All table servers must be on the same subnet and reachable by the
Tournament Server.
 Table Identification: Each running table has a unique name (TableId), changeable
during startup, and a unique URL within the subnet.
 Communication Protocol: The Tournament Server establishes a WebSocket
connection to a table&#39;s URL when that table is added to a tournament, passively
listening to message exchanges.
 Database Recording: The Tournament Server records game history from every table
into an appropriate database schema to enable real-time player ranking.
2 Tournament Management (Super-Admin)
 Role Definition: The Admin acts as a super-admin administering the complete event
(which may contain multiple tournaments).
 Creation: The Super-Admin can create a new tournament (generating a unique
Tournament ID) by defining a unique name, creation datetime, Game Family (Poker
or Teen Patti), Variant/Ruleset, and Start/End dates (or set as open-ended).
 Game Variants: Supported Poker variants include Texas Hold’em, Omaha, and
Pineapple (Table Limit, Pot Limit, or No Limit). Supported Teen Patti variants include 7
different versions.
 Table Attachment: The Super-Admin can dynamically attach or detach existing tables
to an active tournament from the Tournament Module to ensure good competition.
 Modification &amp; Deletion: Super-Admins can modify safe tournament settings and
delete tournaments (restricted to non-running tournaments unless a force-delete
override is used).

 Admin Display UI: The Tournament Server feeds a UI designed for a projector/TV
showing current status, attached tables, health indicators, and a real-time
leaderboard.
3 User Management &amp; Registration
 Registration Interface: A dedicated interface exists for participants to register upon
entering the event.
 Data Collection: The system collects First Name, Last Name, email ID, and optionally
a Phone Number.
 Screen Names: Users must choose a unique screen name. The system prevents
duplicate screen names across the tournament database.
 Physical Badges: Event organizers will print a badge/sticker displaying the user&#39;s
Name and Screen Name.
4 Table &amp; Dealer Operations (Table Manager)
 Role Definition: The Dealer acts as the Table Manager.
 Table Attachment: In addition to the Super-Admin, the Dealer can also attach their
specific table to an active tournament.
 Automatic Table Reset: When a table is attached to a tournament (by either the
Super-Admin or the Dealer), the system automatically resets the table, clearing all
previous game data.
 Table Capacity: Each table has exactly 8 seats.
 Table Topper Display: Shows the current game/variant, ruleset, and tournament
status.
 Landing Screen: The player-facing screen prompts for a Username. Players can
select an existing name.
 Onboarding Validation: The onboarding request is sent to the Tournament Server.
The Dealer UI loop only closes and finalizes the seat assignment after receiving a
successful response from the Tournament Server.
 Financial Controls: The Dealer handles Buy-in, Rebuys, Sit Outs, and Surrendering.
 Game Start: The Dealer can officially start the game once a minimum of 3 players are
onboarded.
5 Gameplay &amp; Scoring

 Continuous Play: Players are not eliminated. They can continually rebuy and
accumulate points.
 Table Mobility: To move tables, a player must first explicitly detach from their current
table, and then walk to the new table to be attached/onboarded.
 Single Active Tournament: A player can only actively accrue points in one tournament
at a time.
 Dynamic Scoring: If a table is attached to a tournament, standings update after every
single hand using a custom scoring formula.
 Detached Tables: If detached, the table reverts to a regular cash game, and hands do
not count toward tournament points.
6 Wallet &amp; State Management
 Wallet Locking: When a user Cashes-In or Onboards, their global wallet on the
Tournament Server is &quot;LOCKED,&quot; preventing transactions from other tables.
 Wallet Unlocking: When the user detaches, surrenders, or cashes out, the wallet is
&quot;UNLOCKED&quot;.

Agile User Stories
Epic 1: Admin &amp; Tournament Management
 US1.1: As a Super-Admin, I want to create a new tournament specifying the game
family, variant, and dates, so that I can schedule and manage multiple event
structures across the venue.
 US1.2: As a Super-Admin, I want to dynamically attach existing physical tables to a
running tournament, so that each tournament has more than one table and there is
good competition.
 US1.3: As the System, I want to automatically reset a table and clear its game data
the moment it is attached to a tournament, so that no previous cash-game data
pollutes the tournament standings.
 US1.4: As a Super-Admin, I want to project a real-time leaderboard and table health
dashboard onto a TV/Projector, so that players and staff can view tournament
standings and system status.
Epic 2: User Registration &amp; Identity
 US2.1: As a Player, I want to register for the event using my name, email, and
optionally my phone number, so that I can participate in tournaments and cash
games.
 US2.2: As a Player, I want to select a unique screen name during registration, so that
I can easily identify myself on leaderboards and at tables without revealing personal
details.
 US2.3: As an Event Organizer, I want to print physical badges containing a player&#39;s
real name and screen name, so that dealers and floor staff can easily identify and
onboard players.
Epic 3: Dealer &amp; Table Operations (Table
Management)
 US3.1: As a Dealer (Table Manager), I want the ability to attach my table to an active
tournament directly from my interface, so that I can independently transition my
table into tournament play.

 US3.2: As a Dealer, I want to view a landing screen where I can search and select a
player&#39;s screen name, so that I can quickly onboard them to an open seat at my
table.
 US3.3: As a Dealer, I want to process physical cash buy-ins and re-buys directly at my
table, so that players can fund their sessions without going to a central cage.
 US3.4: As a Dealer, I want the UI to block me from completing the player onboarding
process until the Tournament Server confirms the action, so that system consistency
and wallet locking are guaranteed.
 US3.5: As a Dealer, I want to mark a player as &quot;Sitting Out&quot; or process their
detachment, so that I can accurately reflect their active participation status at the
table.
 US3.6: As a Dealer, I want the system to restrict me from starting a hand until at
least 3 players are successfully onboarded, so that minimum game requirements are
met.
Epic 4: Gameplay, Scoring &amp; Player Mobility
 US4.1: As a Player, I want my tournament points to update automatically after every
single hand, so that I have real-time feedback on my performance.
 US4.2: As a Player, I want to explicitly detach from my current table and then walk to
a new table to be attached there, so that my global wallet unlocks and I can continue
playing seamlessly.
 US4.3: As the System, I want to ensure a player is only accruing points for one
tournament at a time based on their physical seat, so that multi-tournament
cheating is prevented.
 US4.4: As a Player at a detached table, I want to play standard cash games without
affecting tournament leaderboards, so that I can play casually outside of the main
event.
Epic 5: Infrastructure &amp; Wallet State
 US5.1: As the Tournament Module, I want to function as a passive reader of
messages from the Poker server via WebSocket, so that I have minimal impact on
the existing Poker Game implementation.
 US5.2: As the System, I want to lock a player&#39;s global wallet the moment they
onboard at a table, so that they cannot fraudulently initiate transactions or buy-ins
at other tables simultaneously.

 US5.3: As the System, I want to unlock a player&#39;s global wallet immediately when
they detach or cash out from a table, so that they are free to attach to a new table or
leave the event.