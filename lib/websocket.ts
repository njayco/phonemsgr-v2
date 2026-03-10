import { getApiUrl, queryClient } from '@/lib/query-client';

let wsInstance: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let shouldReconnect = false;
let currentUserId: string | null = null;

type WsEventCallback = (data: any) => void;
const eventListeners = new Map<string, Set<WsEventCallback>>();

let lastTypingSent = 0;
const TYPING_THROTTLE_MS = 100;

export function onWsEvent(type: string, callback: WsEventCallback) {
  if (!eventListeners.has(type)) {
    eventListeners.set(type, new Set());
  }
  eventListeners.get(type)!.add(callback);
}

export function offWsEvent(type: string, callback: WsEventCallback) {
  eventListeners.get(type)?.delete(callback);
}

function emitEvent(type: string, data: any) {
  const listeners = eventListeners.get(type);
  if (listeners) {
    for (const cb of listeners) {
      try { cb(data); } catch {}
    }
  }
}

export function sendTyping(threadId: string, text: string) {
  const now = Date.now();
  if (now - lastTypingSent < TYPING_THROTTLE_MS) return;
  lastTypingSent = now;
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify({ type: 'typing', threadId, text }));
  }
}

export function sendMessageRead(threadId: string) {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify({ type: 'message_read', threadId }));
  }
}

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

        emitEvent(data.type, data);

        if (data.type === 'new_message') {
          queryClient.invalidateQueries({ queryKey: ['/api/threads'] });
          queryClient.invalidateQueries({ queryKey: ['/api/threads', data.threadId, 'messages'] });
        }

        if (data.type === 'message_delivered') {
          queryClient.invalidateQueries({ queryKey: ['/api/threads', data.threadId, 'messages'] });
        }

        if (data.type === 'messages_read') {
          queryClient.invalidateQueries({ queryKey: ['/api/threads', data.threadId, 'messages'] });
        }

        if (data.type === 'message_deleted') {
          queryClient.invalidateQueries({ queryKey: ['/api/threads', data.threadId, 'messages'] });
          queryClient.invalidateQueries({ queryKey: ['/api/threads'] });
        }

        if (data.type === 'kindness_awarded') {
          queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
          queryClient.invalidateQueries({ queryKey: ['/api/kindness/history'] });
          queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        }

        if (data.type === 'new_comment') {
          queryClient.invalidateQueries({ queryKey: ['/api/feed', data.postId, 'comments'] });
          queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
        }

        if (data.type === 'new_notification') {
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
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
