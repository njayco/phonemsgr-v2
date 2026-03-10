import { getApiUrl, queryClient } from '@/lib/query-client';

let wsInstance: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let shouldReconnect = false;
let currentUserId: string | null = null;

export function connectWebSocket(userId: string) {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    return;
  }

  shouldReconnect = true;
  currentUserId = userId;

  try {
    const baseUrl = getApiUrl();
    const wsUrl = baseUrl.replace(/^https?/, 'wss').replace(/\/$/, '') + '/ws';

    wsInstance = new WebSocket(wsUrl);

    wsInstance.onopen = () => {
      wsInstance?.send(JSON.stringify({ type: 'auth', userId }));
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      }, 500);
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
      if (shouldReconnect && currentUserId) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        const uid = currentUserId;
        reconnectTimer = setTimeout(() => {
          connectWebSocket(uid);
        }, 3000);
      }
    };

    wsInstance.onerror = () => {
      wsInstance?.close();
    };
  } catch {}
}

export function disconnectWebSocket() {
  shouldReconnect = false;
  currentUserId = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (wsInstance) {
    wsInstance.onclose = null;
    wsInstance.onerror = null;
    wsInstance.onmessage = null;
    wsInstance.close();
    wsInstance = null;
  }
}
