import http from 'http';
import WebSocket from 'ws';

interface Subscription {
  ws: WebSocket;
  channels: Set<string>;
}

export class LiveUpdateServer {
  private wss: WebSocket.Server;
  private subscriptions: Subscription[] = [];

  constructor(server: http.Server) {
    this.wss = new WebSocket.Server({ server, path: '/ws/live' });

    this.wss.on('connection', (ws: WebSocket) => {
      const sub: Subscription = { ws, channels: new Set() };
      this.subscriptions.push(sub);

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.action === 'subscribe' && msg.channel) {
            sub.channels.add(msg.channel);
            ws.send(JSON.stringify({ type: 'subscribed', channel: msg.channel }));
          } else if (msg.action === 'unsubscribe' && msg.channel) {
            sub.channels.delete(msg.channel);
            ws.send(JSON.stringify({ type: 'unsubscribed', channel: msg.channel }));
          }
        } catch { /* ignore malformed */ }
      });

      ws.on('close', () => {
        this.subscriptions = this.subscriptions.filter(s => s.ws !== ws);
      });
    });
  }

  broadcast(channel: string, payload: any): void {
    const message = JSON.stringify({ channel, ...payload });
    for (const sub of this.subscriptions) {
      if (sub.channels.has(channel) && sub.ws.readyState === WebSocket.OPEN) {
        sub.ws.send(message);
      }
    }
  }

  broadcastLeaderboard(tournamentId: number, leaderboard: any): void {
    this.broadcast(`leaderboard:${tournamentId}`, { type: 'leaderboard_update', data: leaderboard });
  }

  broadcastHealth(health: any): void {
    this.broadcast('health', { type: 'health_update', data: health });
  }

  broadcastTableState(tableId: string, state: any): void {
    this.broadcast(`table:${tableId}`, { type: 'table_update', data: state });
  }
}

export function setupLiveUpdates(server: http.Server): LiveUpdateServer {
  return new LiveUpdateServer(server);
}
