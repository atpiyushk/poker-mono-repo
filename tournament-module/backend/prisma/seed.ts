import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLAYERS = [
  { firstName: 'Daniel', lastName: 'Negreanu', email: 'daniel@poker.com', phone: '+1-555-0101', screenName: 'KidPoker' },
  { firstName: 'Phil', lastName: 'Ivey', email: 'phil.ivey@poker.com', phone: '+1-555-0102', screenName: 'TigerPhil' },
  { firstName: 'Vanessa', lastName: 'Selbst', email: 'vanessa@poker.com', phone: '+1-555-0103', screenName: 'VanessaS' },
  { firstName: 'Erik', lastName: 'Seidel', email: 'erik@poker.com', phone: '+1-555-0104', screenName: 'ErikSeidel' },
  { firstName: 'Fedor', lastName: 'Holz', email: 'fedor@poker.com', phone: '+1-555-0105', screenName: 'CrownUpGuy' },
  { firstName: 'Bryn', lastName: 'Kenney', email: 'bryn@poker.com', phone: '+1-555-0106', screenName: 'BrynKenney' },
  { firstName: 'Justin', lastName: 'Bonomo', email: 'justin@poker.com', phone: '+1-555-0107', screenName: 'ZeeJustin' },
  { firstName: 'Dan', lastName: 'Smith', email: 'dan.smith@poker.com', phone: '+1-555-0108', screenName: 'DanSmith' },
  { firstName: 'Stephen', lastName: 'Chidwick', email: 'stephen@poker.com', phone: '+1-555-0109', screenName: 'Stevie444' },
  { firstName: 'Maria', lastName: 'Konnikova', email: 'maria@poker.com', phone: '+1-555-0110', screenName: 'BluffQueen' },
  { firstName: 'Jason', lastName: 'Koon', email: 'jason@poker.com', phone: '+1-555-0111', screenName: 'JKoon' },
  { firstName: 'Alex', lastName: 'Foxen', email: 'alex@poker.com', phone: '+1-555-0112', screenName: 'AlexFoxen' },
  { firstName: 'Kristen', lastName: 'Bicknell', email: 'kristen@poker.com', phone: '+1-555-0113', screenName: 'KBicknell' },
  { firstName: 'Ali', lastName: 'Imsirovic', email: 'ali@poker.com', phone: '+1-555-0114', screenName: 'AliIms' },
  { firstName: 'Nick', lastName: 'Petrangelo', email: 'nick@poker.com', phone: '+1-555-0115', screenName: 'NickP' },
  { firstName: 'Sam', lastName: 'Soverel', email: 'sam@poker.com', phone: '+1-555-0116', screenName: 'SamSov' },
];

const TABLES = [
  { tableId: 'TBL-001', url: 'ws://192.168.1.10:9000', displayName: 'Table 1 - Main Hall' },
  { tableId: 'TBL-002', url: 'ws://192.168.1.11:9000', displayName: 'Table 2 - VIP Room' },
  { tableId: 'TBL-003', url: 'ws://192.168.1.12:9000', displayName: 'Table 3 - Tournament Floor' },
  { tableId: 'TBL-004', url: 'ws://192.168.1.13:9000', displayName: 'Table 4 - High Stakes' },
];

const POKER_HANDS = [
  'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush',
  'Straight', 'Three of a Kind', 'Two Pair', 'One Pair', 'High Card',
  'Aces Full', 'Kings Full', 'Nut Flush', 'Ace-high Straight', 'Set of Queens',
  'Broadway Straight', 'Wheel', 'Trips', 'Overpair', 'Top Pair Top Kicker',
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

async function main() {
  console.log('Cleaning existing data...');
  await prisma.leaderboardSnapshot.deleteMany();
  await prisma.pointsLedger.deleteMany();
  await prisma.scoringRun.deleteMany();
  await prisma.handResult.deleteMany();
  await prisma.handEvent.deleteMany();
  await prisma.messageEvent.deleteMany();
  await prisma.seatAssignment.deleteMany();
  await prisma.walletLock.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.walletAccount.deleteMany();
  await prisma.tournamentRegistration.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.tournamentTable.deleteMany();
  await prisma.systemHealth.deleteMany();
  await prisma.tableRegistry.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.event.deleteMany();
  await prisma.player.deleteMany();

  console.log('Creating event...');
  const event = await prisma.event.create({
    data: {
      name: 'Las Vegas Championship 2026',
      description: 'Annual championship series featuring multiple poker variants. 3-day event with $50,000 guaranteed prize pool.',
    },
  });

  console.log('Creating tournaments...');
  const tournament1 = await prisma.tournament.create({
    data: {
      eventId: event.id,
      name: 'Main Event - No Limit Hold\'em',
      family: 'Poker',
      variant: 'TexasHoldem',
      limitType: 'NoLimit',
      status: 'active',
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  });

  const tournament2 = await prisma.tournament.create({
    data: {
      eventId: event.id,
      name: 'Side Event - Pot Limit Omaha',
      family: 'Poker',
      variant: 'Omaha',
      limitType: 'PotLimit',
      status: 'active',
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  console.log('Creating players...');
  const players = [];
  for (const p of PLAYERS) {
    const player = await prisma.player.create({ data: p });
    players.push(player);
  }

  console.log('Creating tables...');
  const tableRecords = [];
  for (const t of TABLES) {
    const table = await prisma.tableRegistry.create({ data: t });
    tableRecords.push(table);

    await prisma.systemHealth.create({
      data: {
        tableRegistryId: table.id,
        wsStatus: 'connected',
        lastMessageAt: new Date(Date.now() - rand(5, 60) * 1000),
        reconnectCount: rand(0, 3),
      },
    });
  }

  console.log('Attaching tables to tournaments...');
  const tt1 = await prisma.tournamentTable.create({
    data: { tournamentId: tournament1.id, tableId: tableRecords[0].id, isAttached: true },
  });
  const tt2 = await prisma.tournamentTable.create({
    data: { tournamentId: tournament1.id, tableId: tableRecords[1].id, isAttached: true },
  });
  const tt3 = await prisma.tournamentTable.create({
    data: { tournamentId: tournament2.id, tableId: tableRecords[2].id, isAttached: true },
  });
  const tt4 = await prisma.tournamentTable.create({
    data: { tournamentId: tournament2.id, tableId: tableRecords[3].id, isAttached: true },
  });

  console.log('Creating table sessions...');
  const session1 = await prisma.tableSession.create({
    data: { tournamentTableId: tt1.id, resetRequested: false },
  });
  const session2 = await prisma.tableSession.create({
    data: { tournamentTableId: tt2.id, resetRequested: false },
  });
  const session3 = await prisma.tableSession.create({
    data: { tournamentTableId: tt3.id, resetRequested: false },
  });
  const session4 = await prisma.tableSession.create({
    data: { tournamentTableId: tt4.id, resetRequested: false },
  });

  const sessions = [
    { session: session1, tournament: tournament1, tableReg: tableRecords[0] },
    { session: session2, tournament: tournament1, tableReg: tableRecords[1] },
    { session: session3, tournament: tournament2, tableReg: tableRecords[2] },
    { session: session4, tournament: tournament2, tableReg: tableRecords[3] },
  ];

  // Distribute players across tables: 4 per table for tournament1, 4 per table for tournament2
  const t1Players = players.slice(0, 8);   // 8 players across 2 tables
  const t2Players = players.slice(8, 16);  // 8 players across 2 tables

  const playerTableMap: { playerId: number; sessionIdx: number; seatNumber: number; tournamentId: number }[] = [];

  for (let i = 0; i < 4; i++) {
    playerTableMap.push({ playerId: t1Players[i].id, sessionIdx: 0, seatNumber: i + 1, tournamentId: tournament1.id });
  }
  for (let i = 4; i < 8; i++) {
    playerTableMap.push({ playerId: t1Players[i].id, sessionIdx: 1, seatNumber: i - 3, tournamentId: tournament1.id });
  }
  for (let i = 0; i < 4; i++) {
    playerTableMap.push({ playerId: t2Players[i].id, sessionIdx: 2, seatNumber: i + 1, tournamentId: tournament2.id });
  }
  for (let i = 4; i < Math.min(8, t2Players.length); i++) {
    playerTableMap.push({ playerId: t2Players[i].id, sessionIdx: 3, seatNumber: i - 3, tournamentId: tournament2.id });
  }

  console.log('Creating registrations, seat assignments, wallets...');
  for (const pm of playerTableMap) {
    const sess = sessions[pm.sessionIdx];

    await prisma.tournamentRegistration.create({
      data: { tournamentId: pm.tournamentId, playerId: pm.playerId, activeAccrual: true },
    }).catch(() => {});

    await prisma.seatAssignment.create({
      data: {
        tableSessionId: sess.session.id,
        playerId: pm.playerId,
        seatNumber: pm.seatNumber,
        state: 'seated',
      },
    });

    const buyIn = rand(5000, 20000);
    const wallet = await prisma.walletAccount.create({
      data: { playerId: pm.playerId, eventId: event.id, balance: buyIn },
    });

    await prisma.walletTransaction.create({
      data: {
        walletAccountId: wallet.id,
        type: 'buyin',
        amount: buyIn,
        balanceBefore: 0,
        balanceAfter: buyIn,
        note: 'Initial buy-in',
      },
    });

    await prisma.walletLock.create({
      data: {
        walletAccountId: wallet.id,
        lockedBy: `tournament:${pm.tournamentId}`,
        tableSessionId: sess.session.id,
      },
    });
  }

  console.log('Generating hand history (40 hands per table = 160 total)...');
  const HANDS_PER_TABLE = 40;

  const playerPointsT1: Record<number, number> = {};
  const playerPointsT2: Record<number, number> = {};
  const playerHandsT1: Record<number, number> = {};
  const playerHandsT2: Record<number, number> = {};

  for (const pm of playerTableMap) {
    if (pm.tournamentId === tournament1.id) {
      playerPointsT1[pm.playerId] = 0;
      playerHandsT1[pm.playerId] = 0;
    } else {
      playerPointsT2[pm.playerId] = 0;
      playerHandsT2[pm.playerId] = 0;
    }
  }

  for (let sessIdx = 0; sessIdx < sessions.length; sessIdx++) {
    const sess = sessions[sessIdx];
    const sessPlayers = playerTableMap.filter(p => p.sessionIdx === sessIdx);

    for (let h = 0; h < HANDS_PER_TABLE; h++) {
      const handId = `H-${sess.tableReg.tableId}-${String(h + 1).padStart(4, '0')}`;
      const handTime = new Date(Date.now() - (HANDS_PER_TABLE - h) * 90000 + rand(-10000, 10000));

      await prisma.handEvent.create({
        data: {
          tableSessionId: sess.session.id,
          handId,
          eventType: 'hand_started',
          data: { stage: 1, timestamp: handTime.toISOString() },
          createdAt: handTime,
        },
      });

      // Each hand: generate net chips for each player (zero-sum)
      let netChipsArr = sessPlayers.map(() => randFloat(-2000, 2000));
      const sum = netChipsArr.reduce((a, b) => a + b, 0);
      netChipsArr[0] -= sum; // force zero-sum

      const winnerIdx = netChipsArr.indexOf(Math.max(...netChipsArr));

      for (let pi = 0; pi < sessPlayers.length; pi++) {
        const pm = sessPlayers[pi];
        const netChips = netChipsArr[pi];
        const totalBet = Math.abs(netChips) + rand(50, 500);
        const winAmount = netChips > 0 ? netChips + totalBet : 0;
        const isWinner = pi === winnerIdx;

        await prisma.handResult.create({
          data: {
            tableSessionId: sess.session.id,
            handId,
            playerId: pm.playerId,
            seatId: pm.seatNumber,
            netChips,
            totalBet,
            winAmount,
            winningHand: isWinner ? POKER_HANDS[rand(0, POKER_HANDS.length - 1)] : null,
            isWinner,
            createdAt: handTime,
          },
        });

        // Points = net chips (simple default formula)
        await prisma.pointsLedger.create({
          data: {
            tournamentId: sess.tournament.id,
            playerId: pm.playerId,
            handId,
            pointsDelta: netChips,
            formulaVersion: 'v1',
            createdAt: handTime,
          },
        });

        if (sess.tournament.id === tournament1.id) {
          playerPointsT1[pm.playerId] = (playerPointsT1[pm.playerId] || 0) + netChips;
          playerHandsT1[pm.playerId] = (playerHandsT1[pm.playerId] || 0) + 1;
        } else {
          playerPointsT2[pm.playerId] = (playerPointsT2[pm.playerId] || 0) + netChips;
          playerHandsT2[pm.playerId] = (playerHandsT2[pm.playerId] || 0) + 1;
        }
      }

      await prisma.handEvent.create({
        data: {
          tableSessionId: sess.session.id,
          handId,
          eventType: 'hand_ended',
          data: { stage: 18, timestamp: new Date(handTime.getTime() + rand(30000, 120000)).toISOString() },
          createdAt: new Date(handTime.getTime() + rand(30000, 120000)),
        },
      });

      await prisma.scoringRun.create({
        data: {
          tournamentId: sess.tournament.id,
          handId,
          computedAt: new Date(handTime.getTime() + 500),
        },
      });

      await prisma.messageEvent.create({
        data: {
          tableSessionId: sess.session.id,
          tableId: sess.tableReg.tableId,
          messageType: 'ROUND_RESULT',
          rawJson: { handId, players: sessPlayers.length, stage: 18 },
          receivedAt: handTime,
        },
      });
    }
  }

  // Leaderboard snapshots
  console.log('Creating leaderboard snapshots...');
  const t1Entries = Object.entries(playerPointsT1)
    .map(([pid, pts]) => ({ playerId: Number(pid), totalPoints: pts, handsPlayed: playerHandsT1[Number(pid)] || 0 }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  for (let i = 0; i < t1Entries.length; i++) {
    await prisma.leaderboardSnapshot.create({
      data: {
        tournamentId: tournament1.id,
        playerId: t1Entries[i].playerId,
        totalPoints: t1Entries[i].totalPoints,
        rank: i + 1,
        handsPlayed: t1Entries[i].handsPlayed,
      },
    });
  }

  const t2Entries = Object.entries(playerPointsT2)
    .map(([pid, pts]) => ({ playerId: Number(pid), totalPoints: pts, handsPlayed: playerHandsT2[Number(pid)] || 0 }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  for (let i = 0; i < t2Entries.length; i++) {
    await prisma.leaderboardSnapshot.create({
      data: {
        tournamentId: tournament2.id,
        playerId: t2Entries[i].playerId,
        totalPoints: t2Entries[i].totalPoints,
        rank: i + 1,
        handsPlayed: t2Entries[i].handsPlayed,
      },
    });
  }

  console.log('\n=== SEED COMPLETE ===');
  console.log(`Event:       ${event.name} (id=${event.id})`);
  console.log(`Tournament1: ${tournament1.name} (id=${tournament1.id}) - ${t1Entries.length} players`);
  console.log(`Tournament2: ${tournament2.name} (id=${tournament2.id}) - ${t2Entries.length} players`);
  console.log(`Tables:      ${tableRecords.length} registered, all attached`);
  console.log(`Players:     ${players.length} total`);
  console.log(`Hands:       ${HANDS_PER_TABLE * sessions.length} total (${HANDS_PER_TABLE} per table)`);
  console.log(`\nLeaderboard (Tournament 1 - ${tournament1.name}):`);
  for (const e of t1Entries) {
    const p = players.find(pl => pl.id === e.playerId);
    console.log(`  #${t1Entries.indexOf(e) + 1} ${p?.screenName?.padEnd(14)} ${e.totalPoints.toFixed(0).padStart(8)} pts (${e.handsPlayed} hands)`);
  }
  console.log(`\nLeaderboard (Tournament 2 - ${tournament2.name}):`);
  for (const e of t2Entries) {
    const p = players.find(pl => pl.id === e.playerId);
    console.log(`  #${t2Entries.indexOf(e) + 1} ${p?.screenName?.padEnd(14)} ${e.totalPoints.toFixed(0).padStart(8)} pts (${e.handsPlayed} hands)`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
