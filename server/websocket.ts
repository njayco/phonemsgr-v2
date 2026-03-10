import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { storage } from "./storage";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
}

const clients: Map<string, ConnectedClient[]> = new Map();

export function broadcastToUser(userId: string, payload: any) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  for (const client of userClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

export function isUserOnlineWs(userId: string): boolean {
  const userClients = clients.get(userId);
  return !!userClients && userClients.length > 0;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    let userId = "";

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "auth" && msg.userId) {
          userId = msg.userId;
          if (!clients.has(userId)) {
            clients.set(userId, []);
          }
          clients.get(userId)!.push({ ws, userId });
          storage.setUserOnline(userId, true).catch(() => {});
          ws.send(JSON.stringify({ type: "connected", userId }));
        }

        if (msg.type === "typing" && userId && msg.threadId) {
          broadcastToThreadExcept(msg.threadId, userId, {
            type: "typing",
            threadId: msg.threadId,
            userId,
            text: msg.text || "",
          });
        }

        if (msg.type === "message_read" && userId && msg.threadId) {
          storage.markMessagesRead(msg.threadId, userId).then((senderIds) => {
            for (const senderId of senderIds) {
              broadcastToUser(senderId, {
                type: "messages_read",
                threadId: msg.threadId,
                readByUserId: userId,
              });
            }
          }).catch(() => {});
        }

        if (userId && msg.type !== "auth") {
          storage.updateUser(userId, { lastActiveAt: new Date() }).catch(() => {});
        }
      } catch {}
    });

    ws.on("close", () => {
      if (userId) {
        const userClients = clients.get(userId);
        if (userClients) {
          const filtered = userClients.filter((c) => c.ws !== ws);
          if (filtered.length === 0) {
            clients.delete(userId);
            storage.setUserOnline(userId, false).catch(() => {});
          } else {
            clients.set(userId, filtered);
          }
        }
      }
    });
  });

  function broadcastToThread(
    threadId: string,
    senderId: string,
    message: any,
    recipientIds: string[],
  ) {
    const payload = JSON.stringify({
      type: "new_message",
      threadId,
      message,
    });

    for (const recipientId of recipientIds) {
      const userClients = clients.get(recipientId);
      if (userClients) {
        for (const client of userClients) {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(payload);
          }
        }
      }
    }
  }

  function broadcastToThreadExcept(
    threadId: string,
    excludeUserId: string,
    payload: any,
  ) {
    storage.getThreadParticipantIds(threadId).then((participantIds) => {
      const data = JSON.stringify(payload);
      for (const pid of participantIds) {
        if (pid === excludeUserId) continue;
        const userClients = clients.get(pid);
        if (userClients) {
          for (const client of userClients) {
            if (client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(data);
            }
          }
        }
      }
    }).catch(() => {});
  }

  return broadcastToThread;
}
