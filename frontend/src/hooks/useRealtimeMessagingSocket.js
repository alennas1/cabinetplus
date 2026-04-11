import { useEffect, useRef } from "react";

import { buildMessagingWsUrl } from "../utils/ws";

const useRealtimeMessagingSocket = ({ token, enabled = true, onMessage } = {}) => {
  const wsRef = useRef(null);
  const wsReconnectRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !token) return;

    let disposed = false;

    const cleanupSocket = () => {
      if (wsReconnectRef.current) {
        clearTimeout(wsReconnectRef.current);
        wsReconnectRef.current = null;
      }
      try {
        wsRef.current?.close?.(1000, "page_unload");
      } catch {
        // ignore
      } finally {
        wsRef.current = null;
      }
    };

    const connect = () => {
      cleanupSocket();
      const url = buildMessagingWsUrl();
      if (!url) {
        wsReconnectRef.current = setTimeout(() => {
          if (!disposed) connect();
        }, 800);
        return;
      }
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onclose = () => {
        if (disposed) return;
        wsReconnectRef.current = setTimeout(() => {
          if (!disposed) connect();
        }, 1500);
      };

      ws.onmessage = (event) => {
        if (disposed) return;
        let data = null;
        try {
          data = JSON.parse(event?.data || "null");
        } catch {
          return;
        }
        if (!data || !data.type) return;
        try {
          onMessageRef.current?.(data);
        } catch {
          // ignore
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      cleanupSocket();
    };
  }, [enabled, token]);
};

export default useRealtimeMessagingSocket;
