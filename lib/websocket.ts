import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { getApiUrl, queryClient } from '@/lib/query-client';
import { Platform } from 'react-native';

let wsInstance: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectWebSocket(userId: string) {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    return;
  }

  try {
    const baseUrl = getApiUrl();
    const wsUrl = baseUrl.replace(/^https?/, 'wss').replace(/\/$/, '') + '/ws';

    wsInstance = new WebSocket(wsUrl);

    wsInstance.onopen = () => {
      wsInstance?.send(JSON.stringify({ type: 'auth', userId }));
    };

    wsInstance.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'new_message') {
          queryClient.invalidateQueries({ queryKey: ['/api/threads'] });
          queryClient.invalidateQueries({ queryKey: ['/api/threads', data.threadId, 'messages'] });
        }
      } catch {}
    };

    wsInstance.onclose = () => {
      wsInstance = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        connectWebSocket(userId);
      }, 3000);
    };

    wsInstance.onerror = () => {
      wsInstance?.close();
    };
  } catch {}
}

export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (wsInstance) {
    wsInstance.close();
    wsInstance = null;
  }
}
