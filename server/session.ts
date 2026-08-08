import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const PgStore = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === "production";

// Shared between the Express app and the WebSocket upgrade handshake so
// realtime connections are bound to the same verified session identity.
export const sessionMiddleware = session({
  store: new PgStore({
    pool: pool,
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "phone-msgr-secret-key-2026",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
  },
});
