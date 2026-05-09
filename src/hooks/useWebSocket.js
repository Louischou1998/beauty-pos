import { useEffect, useRef, useCallback } from 'react';

/** 與 API 不同網域時可設 VITE_WS_ORIGIN（例：https://api.example.com，不含路徑） */
function wsBaseUrl() {
  const explicit = import.meta.env.VITE_WS_ORIGIN;
  if (explicit) {
    return String(explicit).replace(/^http/, 'ws');
  }
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '');
  return apiBase.replace(/^http/, 'ws');
}

const WS_BASE = wsBaseUrl();

/**
 * Connects to a WebSocket endpoint and calls onMessage on each event.
 * Automatically reconnects on disconnect (max 5 retries).
 */
export function useWebSocket(path, onMessage) {
  const wsRef = useRef(null);
  const retries = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_BASE}${path}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          onMessageRef.current(payload);
        } catch { /* ignore malformed */ }
      };

      ws.onopen = () => { retries.current = 0; };

      ws.onclose = () => {
        if (retries.current < 5) {
          retries.current += 1;
          setTimeout(connect, 2000 * retries.current);
        }
      };

      ws.onerror = () => ws.close();
    } catch { /* WS not available (API offline) */ }
  }, [path]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);
}
