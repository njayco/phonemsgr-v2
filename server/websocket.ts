import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import type { IncomingMessage } from "node:http";
import { storage } from "./storage";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
}

const clients: Map<string, ConnectedClient[]> = new Map();

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

  return broadcastToThread;
}
