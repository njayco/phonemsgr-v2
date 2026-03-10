# Phone Msgr 2026 - Kindness-Based Social Messenger

## Overview
Phone Msgr is a kindness-based social messenger mobile app built with React Native / Expo. It enables local social connections, secure messaging, and community engagement with a premium futuristic dark UI aesthetic. Phase 5 adds instant messaging with optimistic send, WhatsApp-style delivery receipts, live keystroke typing preview, REDACTED message deletion, real-time kindness/comment updates via WebSocket, in-app notifications, and push notifications via expo-notifications.

## Tech Stack
- **Frontend**: React Native, Expo SDK 54, TypeScript, Expo Router (file-based routing)
- **Backend**: Express.js (port 5000) with TypeScript, serving API + landing page
- **Database**: PostgreSQL (Replit built-in) with Drizzle ORM
- **Auth**: Express sessions with connect-pg-simple, scrypt password hashing
- **Realtime**: WebSocket (ws package) for live message delivery, typing preview, receipts, kindness/comment events, notifications
- **Push Notifications**: expo-notifications (native), Expo Push API (server), in-app fallback (web)
- **State**: React Query for server state, React Context for auth
- **Local Cache**: AsyncStorage with 14-day TTL for messages, threads, and feed posts
- **Uploads**: Multer for file uploads (avatars, media, attachments)
- **Location**: expo-location for GPS, web geolocation API fallback
- **Styling**: React Native StyleSheet with custom dark theme (neon green/blue accents)
- **Fonts**: Inter (400, 500, 600, 700 weights)

## Project Structure
```
shared/
  schema.ts                # Drizzle ORM schema (17 tables) + Zod validation schemas

server/
  index.ts                 # Express server entry with session middleware + WebSocket setup
  routes.ts                # All API routes (auth, threads, messages, feed, settings, nearby, buddies, search, kindness, notifications, push-token)
  storage.ts               # DatabaseStorage class (IStorage interface, all CRUD methods incl. notifications, push tokens, message status/deletion)
  db.ts                    # Drizzle database connection pool
  auth.ts                  # Password hashing (scrypt) + session auth helpers
  websocket.ts             # WebSocket server (user tracking, typing, receipts, message broadcast, kindness/comment events, online/offline presence)
  push.ts                  # Push notification service (Expo Push API)
  uploads.ts               # Multer file upload middleware (avatar, media, attachment)
  seed.ts                  # Demo data seeding (6 users, threads, messages, posts, comments, buddy connections, presence)
  templates/landing-page.html

app/
  _layout.tsx              # Root layout with providers (Auth, QueryClient, Keyboard) + cache purge on start
  index.tsx                # Welcome/landing screen (redirects if authed)
  sign-in.tsx              # Sign in with username/password (API-backed)
  sign-up.tsx              # Registration with username/password/display name
  new-message.tsx          # New message composer with user search (name/username/phone)
  create-post.tsx          # Create feed post with audience picker (everyone/buddy/nearby)
  nearby-list.tsx          # Nearby people list with message/add buddy/remove buddy actions
  +not-found.tsx           # 404 screen
  (tabs)/
    _layout.tsx            # Tab navigation + WebSocket connect/disconnect + notification badge on Home tab
    index.tsx              # Home dashboard (kindness score, plan, recent activity, notification bell + notifications list)
    live-field.tsx         # GPS proximity radar (buddy vs nearby toggle, real location)
    feed.tsx               # Social feed with buddy/nearby filtering, comments, kindness awards, real-time WS updates
    messages.tsx           # Chat thread list with compose button + local cache
    profile.tsx            # User profile with kindness score + badges + sign out
  chat/[id].tsx            # Chat thread with optimistic send, delivery receipts (✓ ✓✓ blue ✓✓), live typing preview, REDACTED deletion + local cache
  pricing.tsx              # Subscription plans (modal)
  monetization.tsx         # Revenue center for Executive users (API-backed)
  offline.tsx              # Mesh mode / offline resilience
  settings.tsx             # Privacy, notifications (push toggle), account settings (API-backed)

components/
  Avatar.tsx               # Initial-based avatar with optional glow
  GlassCard.tsx            # Glassmorphism card component
  GlowButton.tsx           # Glowing CTA button
  StatusChip.tsx           # Online/offline status chip
  ErrorBoundary.tsx        # Error boundary wrapper
  ErrorFallback.tsx        # Error fallback UI

constants/
  colors.ts                # Dark theme color system

lib/
  auth-context.tsx         # Server-backed auth provider (React Query, sessions, graceful sign-out)
  websocket.ts             # WebSocket client (connect, disconnect, auto-reconnect, sendTyping, sendMessageRead, onWsEvent/offWsEvent listener system)
  query-client.ts          # React Query client with API base URL + default fetcher
  local-cache.ts           # AsyncStorage-based local cache with 14-day TTL
  push-notifications.ts    # Push notification registration, permission handling, notification listeners
  mock-data.ts             # Legacy demo data (reference only, not imported by screens)
```

## Database Schema (PostgreSQL + Drizzle ORM)
Key tables in `shared/schema.ts`:
- `users` — profiles with plan tier, kindness score, reputation, isOnline, lastSeenAt, lastActiveAt, pushToken
- `user_interests`, `user_badges` — user metadata
- `message_threads`, `thread_participants` — messaging threads
- `messages` — messages with `status` (sent/delivered/read), `isDeleted`, `deliveredAt`, `readAt`, `deletedAt`
- `notifications` — in-app notifications (type: kindness_award, new_comment, new_message) with isRead flag
- `feed_posts` — social feed with `audience` column (everyone/buddy/nearby)
- `feed_comments` — comments with kindnessScore
- `feed_reactions` — likes with unique constraint per user per post
- `kindness_ledger` — kindness point history with actionType, actorUserId, targetType, targetId
- `kindness_actions` — tracks unique kindness awards per user per target (dedup)
- `buddy_connections` — friend/buddy relationships (bidirectional, status: pending/accepted)
- `nearby_presence` — location-based discovery (lat/lng/lastSeen)
- `events` — hosted events (monetization)
- `monetization_settings`, `user_settings` — per-user config
- `session` — express-session store (connect-pg-simple)

## API Routes
All data routes require session authentication (`req.session.userId`).

**Auth**: POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me (forces isOnline=true)
**Threads**: GET /api/threads, POST /api/threads, GET /api/threads/:id/messages, POST /api/threads/:id/messages
**Message Deletion**: DELETE /api/threads/:threadId/messages/:messageId (sender only; marks isDeleted, broadcasts via WS)
**Feed**: GET /api/feed?type=buddy|nearby, POST /api/feed (with audience), POST /api/feed/:id/like (+5 kindness), POST /api/feed/:id/comment
**Comments**: GET /api/feed/:id/comments
**Kindness Awards**: POST /api/feed/:id/kindness (±10 on post), POST /api/feed/comments/:id/kindness (±10 on comment, post owner only)
**Notifications**: GET /api/notifications, POST /api/notifications/:id/read, GET /api/notifications/unread-count
**Push Token**: POST /api/push-token (stores/clears Expo push token)
**Search**: GET /api/users/search?q= (searches displayName, username, phone)
**Buddies**: GET /api/buddies, POST /api/buddies/:id, DELETE /api/buddies/:id
**Kindness**: GET /api/kindness/history
**Nearby**: GET /api/nearby?type=buddy|nearby&radius=400, POST /api/nearby/update
**Settings**: GET /api/settings, PATCH /api/settings
**Monetization**: GET /api/monetization, PATCH /api/monetization
**Upload**: POST /api/upload/avatar, /api/upload/media, /api/upload/attachment

## WebSocket Events
Server-to-client and client-to-server event types:
- `auth` (C→S) — authenticate with userId
- `typing` (C→S, S→C) — live keystroke preview: `{ threadId, userId, text }`
- `message_read` (C→S) — mark messages as read in thread
- `new_message` (S→C) — new message received: `{ threadId, message }`
- `message_delivered` (S→C) — delivery confirmation: `{ threadId, messageId }`
- `messages_read` (S→C) — read receipt: `{ threadId, readByUserId }`
- `message_deleted` (S→C) — message deletion: `{ threadId, messageId }`
- `kindness_awarded` (S→C) — kindness update: `{ postId, delta, newKindnessScore }`
- `new_comment` (S→C) — new comment on post: `{ postId, comment }`
- `new_notification` (S→C) — in-app notification: `{ notification }`

## Messaging Features
- **Optimistic Send**: Messages appear instantly in chat with temp ID; replaced with server response on success
- **Delivery Receipts**: Single gray check (sent), double gray checks (delivered), blue double checks (read)
- **Live Typing Preview**: Other user sees characters typed/backspaced in real-time ghost bubble (throttled 100ms)
- **Message Deletion**: Long-press to delete own messages; shows "REDACTED" with classified stamp
- **REDACTED Style**: Dark red/amber tint, lock icon, "CLASSIFIED" timestamp

## Push Notifications
- **Native**: expo-notifications for iOS/Android via Expo Go
- **Web**: In-app notifications only (no web push)
- **Toggle**: Push notification permission toggle starts OFF (Expo guidelines)
- **Backend**: Expo Push API via server/push.ts; sends for new messages, kindness awards, new comments
- **Token Management**: POST /api/push-token stores/clears token per user

## Kindness Economy
- **Like a post**: Liker earns +5 kindness (one-time per post, not on own posts)
- **Award post kindness**: Any user can +10 or -10 on a post (one-time per user per post, not on own posts); updates post's kindnessEarned and post owner's kindnessScore; triggers WS event + notification + push
- **Award comment kindness**: Only post owner can +10 or -10 on comments on their post (one-time per comment); updates comment's kindnessScore and commenter's kindnessScore; triggers notification + push
- Duplicate prevention via `kindness_actions` unique constraint on (actorUserId, targetType, targetId)

## Local Cache (14-day TTL)
- `lib/local-cache.ts` provides `cacheSet`, `cacheGet`, `cacheInvalidate`, `cachePurgeExpired`
- Used in: feed.tsx (feed posts by tab), messages.tsx (thread list), chat/[id].tsx (messages per thread)
- Cache is purged on app start via `cachePurgeExpired()` in _layout.tsx
- Shows cached data immediately while API refetch runs in background

## Demo Credentials
- Username: `alexchen` / Password: `demo1234`
- 5 other demo users seeded automatically on first startup
- Demo buddy connections: alexchen ↔ barbaraw, alexchen ↔ miastardust, alexchen ↔ alexquantum
- All demo users have nearby presence entries within 400m of each other

## Design System
- Background: #0A0A0F (deep black)
- Surface: #12121A, #1A1A25
- Accent Blue: #00AAFF (messaging, actions)
- Accent Green: #00FF88 (kindness, resilience, online state)
- Accent Cyan: #00E5FF (monetization)
- Warning: #FFB800 (upgrades, offline)
- Glass cards with rgba borders and subtle backgrounds

## Workflows
- **Start Backend**: `npm run server:dev` (Express + WebSocket on port 5000)
- **Start Frontend**: `npm run expo:dev` (Expo on port 8081)

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)
- `SESSION_SECRET` — Session signing secret
- `EXPO_PUBLIC_DOMAIN` — Backend domain for API requests (injected at dev/build time)

## Important Notes
- After login/signup use `router.replace('/')` NOT `router.replace('/(tabs)')` to avoid NativeStack crash
- `db:push` requires `--force` flag to avoid interactive prompt
- WebSocket tracks online/offline presence: sets isOnline true on connect, false when all connections close
- `/api/auth/me` forces isOnline=true for the requesting user (they are clearly active)
- Sign-out wraps the logout API call in try/catch — always clears local state even if API fails
- Feed audience values: "everyone", "buddy", "nearby" (default "everyone")
- Nearby queries accept radius in meters (default 400m)
- GPS: uses expo-location on native, web geolocation API on web, falls back to NYC coords
- Message text replaced with "REDACTED" for deleted messages in both getMessages and getThreadsForUser

## TODO
- Anti-abuse/rate limiting on kindness actions
- Content moderation review system
- Analytics around kindness actions
- More advanced presence handling (heartbeat, timeout)
