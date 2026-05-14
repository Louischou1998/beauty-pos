import { useEffect, useRef, useCallback } from 'react';

function wsBaseUrl() {
  const explicit = import.meta.env.VITE_WS_ORIGIN;
  if (explicit) {
    return String(explicit).replace(/^http/, 'ws');
  }
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '');
  return apiBase.replace(/^http/, 'ws');
}

const WS_BASE = wsBaseUrl();

export function useWebSocket(path, onMessage) {
  const wsRef = useRef(null);
  const retries = useRef(0);
  const cancelledRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (cancelledRef.current) return;
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
        if (!cancelledRef.current && retries.current < 5) {
          retries.current += 1;
          setTimeout(connect, 2000 * retries.current);
        }
      };

      ws.onerror = () => ws.close();
    } catch { /* WS not available */ }
  }, [path]);

  useEffect(() => {
    cancelledRef.current = false;
    connect();
    return () => {
      cancelledRef.current = true;
      wsRef.current?.close();
    };
  }, [connect]);
}
