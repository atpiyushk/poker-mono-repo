import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { PrismaClient, WsStatus } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

interface TableConnection {
  ws: WebSocket | null;
  tableRegistryId: number;
  tableId: string;
  url: string;
  sessionId: number | null;
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  pongReceived: boolean;
}

export class WsConnectorManager extends EventEmitter {
  private connections = new Map<string, TableConnection>();

  async connect(tableRegistryId: number, tableId: string, url: string, sessionId: number): Promise<void> {
    if (this.connections.has(tableId)) {
      await this.disconnect(tableId);
    }

    const conn: TableConnection = {
      ws: null,
      tableRegistryId,
      tableId,
      url,
      sessionId,
      reconnectAttempts: 0,
      reconnectTimer: null,
      heartbeatTimer: null,
      pongReceived: true,
    };

    this.connections.set(tableId, conn);
    await this.establishConnection(conn);
  }

  private async establishConnection(conn: TableConnection): Promise<void> {
    const wsUrl = conn.url.replace(/^http/, 'ws');
    const fullUrl = `${wsUrl}/holdem/wsclient/admin`;

    try {
      const ws = new WebSocket(fullUrl);
      conn.ws = ws;

      ws.on('open', async () => {
        conn.reconnectAttempts = 0;
        ws.send(JSON.stringify({ MessageType: 'INITIALIZE_ADMIN' }));
        await this.updateHealth(conn.tableRegistryId, WsStatus.connected);
        this.startHeartbeat(conn);
        this.emit('connected', { tableId: conn.tableId });
      });

      ws.on('message', (data: WebSocket.Data) => {
        const raw = data.toString();
        try {
          const parsed = JSON.parse(raw);
          this.emit('message', {
            tableId: conn.tableId,
            sessionId: conn.sessionId,
            messageType: parsed.MessageType || 'unknown',
            raw: parsed,
          });
          this.updateHealthTimestamp(conn.tableRegistryId);
        } catch {
          this.emit('message', {
            tableId: conn.tableId,
            sessionId: conn.sessionId,
            messageType: 'unparseable',
            raw: { rawText: raw },
          });
        }
      });

      ws.on('pong', () => {
        conn.pongReceived = true;
      });

      ws.on('close', async () => {
        this.stopHeartbeat(conn);
        await this.updateHealth(conn.tableRegistryId, WsStatus.disconnected);
        this.emit('disconnected', { tableId: conn.tableId });
        this.scheduleReconnect(conn);
      });

      ws.on('error', async (err) => {
        await this.updateHealth(conn.tableRegistryId, WsStatus.error, err.message);
        this.emit('error', { tableId: conn.tableId, error: err.message });
      });
    } catch (err: any) {
      await this.updateHealth(conn.tableRegistryId, WsStatus.error, err.message);
      this.scheduleReconnect(conn);
    }
  }

  private startHeartbeat(conn: TableConnection): void {
    this.stopHeartbeat(conn);
    conn.heartbeatTimer = setInterval(() => {
      if (!conn.pongReceived) {
        conn.ws?.terminate();
        return;
      }
      conn.pongReceived = false;
      conn.ws?.ping();
    }, config.ws.heartbeatIntervalMs);
  }

  private stopHeartbeat(conn: TableConnection): void {
    if (conn.heartbeatTimer) {
      clearInterval(conn.heartbeatTimer);
      conn.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(conn: TableConnection): void {
    if (conn.reconnectTimer) return;
    if (!this.connections.has(conn.tableId)) return;

    const delay = Math.min(
      config.ws.reconnect.initialDelayMs * Math.pow(config.ws.reconnect.multiplier, conn.reconnectAttempts),
      config.ws.reconnect.maxDelayMs
    );
    conn.reconnectAttempts++;

    conn.reconnectTimer = setTimeout(async () => {
      conn.reconnectTimer = null;
      if (this.connections.has(conn.tableId)) {
        await this.incrementReconnectCount(conn.tableRegistryId);
        await this.establishConnection(conn);
      }
    }, delay);
  }

  async disconnect(tableId: string): Promise<void> {
    const conn = this.connections.get(tableId);
    if (!conn) return;

    if (conn.reconnectTimer) {
      clearTimeout(conn.reconnectTimer);
      conn.reconnectTimer = null;
    }
    this.stopHeartbeat(conn);
    conn.ws?.close();
    this.connections.delete(tableId);
    await this.updateHealth(conn.tableRegistryId, WsStatus.disconnected);
  }

  updateSessionId(tableId: string, sessionId: number): void {
    const conn = this.connections.get(tableId);
    if (conn) conn.sessionId = sessionId;
  }

  isConnected(tableId: string): boolean {
    const conn = this.connections.get(tableId);
    return conn?.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionStatus(): { tableId: string; connected: boolean }[] {
    return Array.from(this.connections.entries()).map(([tableId, conn]) => ({
      tableId,
      connected: conn.ws?.readyState === WebSocket.OPEN,
    }));
  }

  private async updateHealth(tableRegistryId: number, status: WsStatus, error?: string): Promise<void> {
    try {
      await prisma.systemHealth.upsert({
        where: { tableRegistryId },
        update: {
          wsStatus: status,
          lastError: error || null,
          ...(status === WsStatus.connected ? { lastMessageAt: new Date() } : {}),
        },
        create: {
          tableRegistryId,
          wsStatus: status,
          lastError: error || null,
        },
      });
    } catch { /* non-critical */ }
  }

  private async updateHealthTimestamp(tableRegistryId: number): Promise<void> {
    try {
      await prisma.systemHealth.update({
        where: { tableRegistryId },
        data: { lastMessageAt: new Date() },
      });
    } catch { /* non-critical */ }
  }

  private async incrementReconnectCount(tableRegistryId: number): Promise<void> {
    try {
      await prisma.systemHealth.update({
        where: { tableRegistryId },
        data: { reconnectCount: { increment: 1 } },
      });
    } catch { /* non-critical */ }
  }
}
