import { useEffect, useRef, useCallback, useState } from 'react';

type MessageHandler = (data: any) => void;

export function useLiveUpdates(channels: string[], onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live`);

    ws.onopen = () => {
      setConnected(true);
      for (const ch of channels) {
        ws.send(JSON.stringify({ action: 'subscribe', channel: ch }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, [channels.join(',')]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
