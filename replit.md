# Phone Msgr 2026 - Kindness-Based Social Messenger

## Overview
Phone Msgr is a kindness-based social messenger mobile app built with React Native / Expo. It enables local social connections, secure messaging, and community engagement with a premium futuristic dark UI aesthetic. Phase 3 adds user search, feed audience filtering, GPS-based live field, nearby people list, and online/offline presence tracking.

## Tech Stack
- **Frontend**: React Native, Expo SDK 54, TypeScript, Expo Router (file-based routing)
- **Backend**: Express.js (port 5000) with TypeScript, serving API + landing page
- **Database**: PostgreSQL (Replit built-in) with Drizzle ORM
- **Auth**: Express sessions with connect-pg-simple, scrypt password hashing
- **Realtime**: WebSocket (ws package) for live message delivery and presence
- **State**: React Query for server state, React Context for auth
- **Uploads**: Multer for file uploads (avatars, media, attachments)
- **Location**: expo-location for GPS, web geolocation API fallback
- **Styling**: React Native StyleSheet with custom dark theme (neon green/blue accents)
- **Fonts**: Inter (400, 500, 600, 700 weights)

## Project Structure
```
shared/
  schema.ts                # Drizzle ORM schema (15 tables) + Zod validation schemas

server/
  index.ts                 # Express server entry with session middleware + WebSocket setup
  routes.ts                # All API routes (auth, threads, messages, feed, settings, nearby, buddies, search)
  storage.ts               # DatabaseStorage class (IStorage interface, all CRUD methods)
  db.ts                    # Drizzle database connection pool
  auth.ts                  # Password hashing (scrypt) + session auth helpers
  websocket.ts             # WebSocket server (user tracking, message broadcast, online/offline presence)
  uploads.ts               # Multer file upload middleware (avatar, media, attachment)
  seed.ts                  # Demo data seeding (6 users, threads, messages, posts, buddy connections, presence)
  templates/landing-page.html

app/
  _layout.tsx              # Root layout with providers (Auth, QueryClient, Keyboard)
  index.tsx                # Welcome/landing screen (redirects if authed)
  sign-in.tsx              # Sign in with username/password (API-backed)
  sign-up.tsx              # Registration with username/password/display name
  new-message.tsx          # New message composer with user search (name/username/phone)
  create-post.tsx          # Create feed post with audience picker (everyone/buddy/nearby)
  nearby-list.tsx          # Nearby people list with message/add buddy actions
  +not-found.tsx           # 404 screen
  (tabs)/
    _layout.tsx            # Tab navigation + WebSocket connect/disconnect
    index.tsx              # Home dashboard (kindness score, plan, recent activity)
    live-field.tsx         # GPS proximity radar (buddy vs nearby toggle, real location)
    feed.tsx               # Social feed with buddy/nearby filtering + create post button
    messages.tsx           # Chat thread list with compose button
    profile.tsx            # User profile with kindness score + badges
  chat/[id].tsx            # Chat thread with BEAM send (real messages API)
  pricing.tsx              # Subscription plans (modal)
  monetization.tsx         # Revenue center for Executive users (API-backed)
  offline.tsx              # Mesh mode / offline resilience
  settings.tsx             # Privacy, notifications, account settings (API-backed)

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
  auth-context.tsx         # Server-backed auth provider (React Query, sessions)
  websocket.ts             # WebSocket client (connect, disconnect, auto-reconnect)
  query-client.ts          # React Query client with API base URL + default fetcher
  mock-data.ts             # Legacy demo data (reference only, not imported by screens)
```

## Database Schema (PostgreSQL + Drizzle ORM)
Key tables in `shared/schema.ts`:
- `users` — profiles with plan tier, kindness score, reputation, isOnline flag
- `user_interests`, `user_badges` — user metadata
- `message_threads`, `thread_participants`, `messages` — messaging
- `feed_posts` — social feed with `audience` column (everyone/buddy/nearby)
- `feed_comments`, `feed_reactions` — feed interactions
- `kindness_ledger` — kindness point history
- `buddy_connections` — friend/buddy relationships (bidirectional, status: pending/accepted)
- `nearby_presence` — location-based discovery (lat/lng/lastSeen)
- `events` — hosted events (monetization)
- `monetization_settings`, `user_settings` — per-user config
- `session` — express-session store (connect-pg-simple)

## API Routes
All data routes require session authentication (`req.session.userId`).

**Auth**: POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me
**Threads**: GET /api/threads, POST /api/threads, GET /api/threads/:id/messages, POST /api/threads/:id/messages
**Feed**: GET /api/feed?type=buddy|nearby, POST /api/feed (with audience), POST /api/feed/:id/like, POST /api/feed/:id/comment
**Search**: GET /api/users/search?q= (searches displayName, username, phone)
**Buddies**: GET /api/buddies, POST /api/buddies/:id
**Kindness**: GET /api/kindness/history
**Nearby**: GET /api/nearby?type=buddy|nearby&radius=400, POST /api/nearby/update
**Settings**: GET /api/settings, PATCH /api/settings
**Monetization**: GET /api/monetization, PATCH /api/monetization
**Upload**: POST /api/upload/avatar, /api/upload/media, /api/upload/attachment

## Demo Credentials
- Username: `alexchen` / Password: `demo1234`
- 5 other demo users seeded automatically on first startup
- Demo buddy connections: alexchen ↔ barbaraw, alexchen ↔ miastardust, alexchen ↔ quantumq
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
- Feed audience values: "everyone", "buddy", "nearby" (default "everyone")
- Nearby queries accept radius in meters (default 400m)
- GPS: uses expo-location on native, web geolocation API on web, falls back to NYC coords
