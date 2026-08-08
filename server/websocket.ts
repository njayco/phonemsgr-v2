import { WebSocketServer, WebSocket } from "ws";
import { ServerResponse } from "node:http";
import type { Server } from "node:http";
import { storage } from "./storage";
import { sessionMiddleware } from "./session";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
}

const clients: Map<string, ConnectedClient[]> = new Map();

// --- Direct to Talk (half-duplex walkie-talkie) session state ---
// One session per thread. The server is the single authority on who
// holds the voice channel (speakerId); audio frames are only relayed
// when they come from the current speaker.
interface DttSession {
  participants: Set<string>;
  speakerId: string | null;
  // Socket each participant joined from — membership and speaker claims
  // are bound to this connection, so a dying socket releases them even
  // when the user has other authenticated sockets.
  sockets: Map<string, WebSocket>;
  // Short post-release window during which the previous speaker's final
  // in-flight segment is still relayed (as long as nobody else has
  // acquired the channel), so sub-segment presses aren't silent.
  draining: { userId: string; until: number } | null;
}
const dttSessions: Map<string, DttSession> = new Map();

function dttBroadcast(session: DttSession, payload: any, exceptUserId?: string) {
  const data = JSON.stringify(payload);
  for (const pid of session.participants) {
    if (pid === exceptUserId) continue;
    const userClients = clients.get(pid);
    if (!userClients) continue;
    for (const client of userClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }
}

// Drop session members (and a stale speaker) that no longer have any live
// socket — e.g. after a client vanished without a clean TCP close.
function dttPruneSession(threadId: string, session: DttSession) {
  for (const pid of Array.from(session.participants)) {
    const bound = session.sockets.get(pid);
    const boundDead = bound !== undefined && bound.readyState !== WebSocket.OPEN;
    if (!isUserOnlineWs(pid) || boundDead) {
      session.participants.delete(pid);
      session.sockets.delete(pid);
      if (session.speakerId === pid) session.speakerId = null;
    }
  }
  if (session.speakerId && !isUserOnlineWs(session.speakerId)) {
    session.speakerId = null;
  }
  if (session.participants.size === 0) dttSessions.delete(threadId);
}

function dttRemoveUser(threadId: string, userId: string) {
  const session = dttSessions.get(threadId);
  if (!session || !session.participants.has(userId)) return;
  session.participants.delete(userId);
  session.sockets.delete(userId);
  if (session.draining?.userId === userId) session.draining = null;
  if (session.speakerId === userId) {
    session.speakerId = null;
    dttBroadcast(session, { type: "dtt_talk_end", threadId, userId });
  }
  if (session.participants.size === 0) {
    dttSessions.delete(threadId);
  } else {
    dttBroadcast(session, { type: "dtt_peer_left", threadId, userId });
  }
}

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

  // Heartbeat: terminate zombie sockets (clients that vanished without a
  // TCP close) so their close handlers run and DTT/presence state is freed.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const w = ws as WebSocket & { isAlive?: boolean };
      if (w.isAlive === false) {
        w.terminate();
        continue;
      }
      w.isAlive = false;
      w.ping();
    }
  }, 10_000);
  (heartbeat as unknown as { unref?: () => void }).unref?.();
  wss.on("close", () => clearInterval(heartbeat));

  wss.on("connection", (ws, req) => {
    (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    ws.on("pong", () => {
      (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    });
    let userId = "";

    // Identity comes from the verified session cookie on the upgrade
    // request — never from a client-supplied value. Unauthenticated
    // connections are rejected before any message handling.
    // express-session patches res.writeHead/res.end, so give it a real
    // ServerResponse tied to this request instead of a bare object.
    const dummyRes = new ServerResponse(req);
    sessionMiddleware(req as any, dummyRes as any, () => {
      const sessionUserId = (req as any).session?.userId;
      if (!sessionUserId || ws.readyState !== WebSocket.OPEN) {
        ws.close(4401, "unauthenticated");
        return;
      }
      userId = sessionUserId;
      if (!clients.has(userId)) {
        clients.set(userId, []);
      }
      clients.get(userId)!.push({ ws, userId });
      storage.setUserOnline(userId, true).catch(() => {});
      ws.send(JSON.stringify({ type: "connected", userId }));
    });

    ws.on("message", (data) => {
      if (!userId) return; // session not verified (yet) — ignore all input
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "typing" && userId && msg.threadId) {
          broadcastToThreadExcept(msg.threadId, userId, {
            type: "typing",
            threadId: msg.threadId,
            userId,
            text: msg.text || "",
          });
        }

        if (msg.type === "nudge" && userId && msg.threadId) {
          storage.getThreadParticipantIds(msg.threadId).then((participantIds) => {
            if (!participantIds.includes(userId)) return;
            const data = JSON.stringify({
              type: "nudge_received",
              threadId: msg.threadId,
              fromUserId: userId,
            });
            for (const pid of participantIds) {
              if (pid === userId) continue;
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

        // --- Direct to Talk signaling ---
        if (msg.type === "dtt_join" && userId && msg.threadId) {
          const threadId = msg.threadId;
          storage.getThreadParticipantIds(threadId).then((participantIds) => {
            if (!participantIds.includes(userId)) return;
            let session = dttSessions.get(threadId);
            if (session) dttPruneSession(threadId, session);
            session = dttSessions.get(threadId);
            if (!session) {
              session = { participants: new Set(), speakerId: null, sockets: new Map(), draining: null };
              dttSessions.set(threadId, session);
            }
            const isNew = !session.participants.has(userId);
            session.participants.add(userId);
            session.sockets.set(userId, ws);
            // A (re)joining user cannot be mid-transmission — clear a stale
            // claim left behind by an unclean disconnect (zombie socket).
            if (session.speakerId === userId) {
              session.speakerId = null;
            }
            const peerIds = participantIds.filter((p) => p !== userId);
            const peerOnline = peerIds.some((p) => {
              const c = clients.get(p);
              return !!c && c.length > 0;
            });
            broadcastToUser(userId, {
              type: "dtt_state",
              threadId,
              speakerId: session.speakerId,
              participants: Array.from(session.participants),
              peerOnline,
            });
            if (isNew) {
              dttBroadcast(session, { type: "dtt_peer_joined", threadId, userId }, userId);
            }
            // Nudge the peer's device so their chat screen can surface the
            // session. Sent on every join (not just new ones): if the peer
            // already has the overlay open it's a harmless no-op, and stale
            // session state (e.g. a zombie socket awaiting heartbeat
            // reaping) must never suppress it.
            for (const pid of peerIds) {
              broadcastToUser(pid, { type: "dtt_invite", threadId, fromUserId: userId });
            }
          }).catch(() => {});
        }

        if (msg.type === "dtt_talk_start" && userId && msg.threadId) {
          const session = dttSessions.get(msg.threadId);
          if (session && session.participants.has(userId)) {
            if (session.speakerId === null || session.speakerId === userId) {
              session.speakerId = userId;
              session.sockets.set(userId, ws);
              if (session.draining?.userId !== userId) session.draining = null;
              // Explicit acquisition ack to the requester — the client only
              // starts recording once the server confirms channel ownership.
              broadcastToUser(userId, { type: "dtt_talk_granted", threadId: msg.threadId, userId });
              // Note: dttBroadcast without an exclusion reaches ALL session
              // participants, including the speaker.
              dttBroadcast(session, { type: "dtt_talk_start", threadId: msg.threadId, userId });
            } else {
              broadcastToUser(userId, { type: "dtt_denied", threadId: msg.threadId, speakerId: session.speakerId });
            }
          }
        }

        if (msg.type === "dtt_audio" && userId && msg.threadId && typeof msg.data === "string" && msg.data.length < 600_000) {
          const session = dttSessions.get(msg.threadId);
          // Only the current channel holder may transmit — plus a short
          // post-release drain window for the previous speaker's final
          // in-flight segment, but never once someone else holds the channel.
          const inDrain =
            !!session &&
            session.speakerId === null &&
            session.draining !== null &&
            session.draining.userId === userId &&
            Date.now() < session.draining.until &&
            session.participants.has(userId);
          if (session && (session.speakerId === userId || inDrain)) {
            dttBroadcast(session, {
              type: "dtt_audio",
              threadId: msg.threadId,
              userId,
              seq: msg.seq,
              mime: msg.mime,
              data: msg.data,
            }, userId);
          }
        }

        if (msg.type === "dtt_talk_end" && userId && msg.threadId) {
          const session = dttSessions.get(msg.threadId);
          if (session && session.speakerId === userId) {
            session.speakerId = null;
            // Accept the released speaker's final in-flight segment for a
            // short drain window (cleared if another speaker acquires).
            session.draining = { userId, until: Date.now() + 2000 };
            dttBroadcast(session, { type: "dtt_talk_end", threadId: msg.threadId, userId });
          }
        }

        if (msg.type === "dtt_leave" && userId && msg.threadId) {
          dttRemoveUser(msg.threadId, userId);
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
        // DTT membership/speaker claims are bound to the joining socket:
        // if THIS socket held them, release now even when the user still
        // has other authenticated sockets open.
        for (const [threadId, session] of dttSessions) {
          if (session.participants.has(userId) && session.sockets.get(userId) === ws) {
            dttRemoveUser(threadId, userId);
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
