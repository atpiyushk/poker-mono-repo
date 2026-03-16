import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface ParsedEvent {
  handId: string;
  eventType: string;
  seatId?: number;
  data?: any;
}

export interface HandEndData {
  handId: string;
  tableId: string;
  sessionId: number;
  seats: SeatSnapshot[];
  winners: WinnerSnapshot[];
}

export interface SeatSnapshot {
  seatId: number;
  uid: string;
  balance: number;
  totalBet: number;
  winAmount: number;
  gameStatus: string;
  isPlaying: boolean;
}

export interface WinnerSnapshot {
  seatId: number;
  winAmount: number;
  rake: number;
  hand: string;
  totalBet: number;
}

type HandlerFn = (msg: any, sessionId: number, tableId: string) => Promise<ParsedEvent[]>;

class MessageParser extends EventEmitter {
  private handlers = new Map<string, HandlerFn>();

  constructor() {
    super();
    this.registerDefaults();
  }

  registerHandler(messageType: string, handler: HandlerFn): void {
    this.handlers.set(messageType, handler);
  }

  async parse(messageType: string, raw: any, sessionId: number, tableId: string): Promise<ParsedEvent[]> {
    const handler = this.handlers.get(messageType);
    if (!handler) return [];

    const events = await handler(raw, sessionId, tableId);

    for (const evt of events) {
      await prisma.handEvent.create({
        data: {
          tableSessionId: sessionId,
          handId: evt.handId,
          eventType: evt.eventType,
          seatId: evt.seatId ?? null,
          data: evt.data ?? null,
        },
      });
    }

    return events;
  }

  private registerDefaults(): void {
    this.registerHandler('InitialData', async (msg, sessionId, tableId) => {
      const data = msg.data;
      if (!data) return [];

      const events: ParsedEvent[] = [{
        handId: String(data.roundId || msg.roundId || 0),
        eventType: 'initial_snapshot',
        data: {
          configData: data.configData,
          seats: data.seats?.map((s: any) => ({
            seatId: s.id,
            uid: s.uid,
            name: s.name,
            balance: s.balance,
            connected: s.connected,
          })),
          stage: data.stage,
          potAmount: data.potAmount,
        },
      }];

      return events;
    });

    this.registerHandler('tableDataUpdated', async (msg, sessionId, tableId) => {
      const data = msg.data;
      if (!data) return [];

      const roundId = String(data.roundId || 0);
      const stage = data.stage;
      const events: ParsedEvent[] = [];

      events.push({
        handId: roundId,
        eventType: 'state_update',
        data: { stage, potAmount: data.potAmount },
      });

      // Detect hand end at showdown (stage 16 or 18)
      if (stage === '16' || stage === '18') {
        const seats: SeatSnapshot[] = (data.seats || []).map((s: any) => ({
          seatId: s.id,
          uid: s.uid,
          balance: s.balance,
          totalBet: s.totalBet || 0,
          winAmount: s.winAmount || 0,
          gameStatus: s.gameStatus || '',
          isPlaying: s.isPlaying,
        }));

        const winners: WinnerSnapshot[] = (data.winners || []).map((w: any) => ({
          seatId: w.id,
          winAmount: w.winAmount || 0,
          rake: w.rake || 0,
          hand: w.hand || '',
          totalBet: w.totalBet || 0,
        }));

        events.push({
          handId: roundId,
          eventType: 'hand_ended',
          data: { seats, winners, stage },
        });

        this.emit('hand_ended', {
          handId: roundId,
          tableId,
          sessionId,
          seats,
          winners,
        } as HandEndData);
      }

      return events;
    });

    this.registerHandler('ROUND_RESULT', async (msg, sessionId, tableId) => {
      return [{
        handId: String(msg.roundId || 0),
        eventType: 'round_result',
        data: {
          transType: msg.transType,
          gameName: msg.gameName,
          winningHand: msg.winningHand,
          playersTotalBet: msg.playersTotalBet,
        },
      }];
    });

    // Money transactions from table
    const moneyHandler: HandlerFn = async (msg, sessionId, tableId) => {
      return [{
        handId: String(msg.roundId || 0),
        eventType: `money_${(msg.MessageType || '').toLowerCase()}`,
        seatId: undefined,
        data: {
          messageType: msg.MessageType,
          playerIp: msg.playerIp,
          amount: msg.amount,
          oldBalance: msg.oldBalance,
          newBalance: msg.newBalance,
          rake: msg.rake,
          transType: msg.transType,
        },
      }];
    };

    for (const mt of [
      'DEPOSIT_SUCCESS', 'WITHDRAW_SUCCESS',
      'PLAYER_BET_WON', 'PLAYER_BET_LOST', 'PLAYER_BET_PLACED',
      'DEPOSIT_REQ', 'WITHDRAW_REQ',
    ]) {
      this.registerHandler(mt, moneyHandler);
    }

    this.registerHandler('PLAYER_UPDATED', async (msg) => {
      return [{
        handId: '0',
        eventType: 'player_status',
        data: { player: msg.player, messageType: msg.MessageType },
      }];
    });

    this.registerHandler('PLAYER_ONLINE', async (msg) => {
      return [{
        handId: '0',
        eventType: 'player_online',
        data: { player: msg.player },
      }];
    });

    this.registerHandler('PLAYER_OFFLINE', async (msg) => {
      return [{
        handId: '0',
        eventType: 'player_offline',
        data: { player: msg.player },
      }];
    });

    this.registerHandler('PLAYER_CREATED', async (msg) => {
      return [{
        handId: '0',
        eventType: 'player_created',
        data: { player: msg.player },
      }];
    });
  }
}

export const messageParser = new MessageParser();
