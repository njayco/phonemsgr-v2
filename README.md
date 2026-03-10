# Phone Msgr 2026

**The Kindness-Based Social Messenger for Real Life — Online or Offline**

Phone Msgr is a kindness-based social messenger that helps people connect locally, communicate securely, and stay reachable online or offline. Built by [Denoko Inc.](https://github.com/njayco) (A Denoko Cooperative).

---

## Overview

Phone Msgr combines secure messaging, local social discovery, a kindness economy, creator monetization tools, and future-ready offline resilience into a single premium mobile experience.

### Key Pillars

- **Messaging & Identity** — Instant messaging with optimistic send, WhatsApp-style delivery receipts (✓ ✓✓ blue ✓✓), live keystroke typing preview, and REDACTED message deletion
- **Live Field Discovery** — Proximity-based radar showing nearby users, shared interests, and distance labels
- **Phone Feed** — Social content timeline with Buddy and Nearby feeds, media attachments, kindness rewards, pull-to-refresh, and real-time updates
- **Kindness Economy** — Earn and track kindness points through positive community interactions with cumulative bounded awards
- **Notifications** — In-app notification bell + list, push notifications via expo-notifications (native), real-time WebSocket delivery
- **Monetization Center** — Inbox pricing, paid events, revenue dashboards, and creator tools (Executive tier)
- **Offline Resilience** — Future mesh networking layer for communication during internet disruption

---

## Screenshots & Design

The app features a premium futuristic dark theme with neon green and blue accents, glassmorphism cards, and a sci-fi consumer app aesthetic. Key screens include:

| Screen | Description |
|--------|-------------|
| **Welcome** | Cinematic onboarding with "Connect. Earn Kindness. Stay Resilient." tagline |
| **Home Dashboard** | Kindness score, plan status, quick actions, notification bell + notifications list |
| **Live Field** | Radar/proximity map with nearby user avatars and interest chips |
| **Phone Feed** | Social timeline with video, image, audio, and document post types, pull-to-refresh |
| **Messages** | Thread list with E2E encryption indicators and online/offline status |
| **Chat Thread** | Optimistic send, delivery receipts (✓ ✓✓ blue ✓✓), live typing preview, REDACTED deletion |
| **Profile** | Halo avatar, bio (200 char), link, lifetime kindness score, reputation bar, badges, user's posts |
| **Public Profiles** | View any user's profile by tapping their avatar/name in feed, messages, or live field |
| **Monetization** | Revenue chart, inbox pricing controls, event hosting tools |
| **Pricing** | Three-tier subscription plans (Temp, Associate, Executive) |
| **Mesh Mode** | Offline resilience simulation with relay status and message queue |
| **Settings** | Ghost mode, discovery filters, push notification toggle, privacy controls |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native with Expo SDK 54 |
| **Language** | TypeScript |
| **Routing** | Expo Router (file-based routing) |
| **Database** | PostgreSQL with Drizzle ORM |
| **Auth** | Express sessions with connect-pg-simple, scrypt password hashing |
| **Realtime** | WebSocket (ws package) for live message delivery, typing, receipts, kindness events, notifications, presence |
| **Push Notifications** | expo-notifications (native), Expo Push API (server), in-app fallback (web) |
| **Server State** | TanStack React Query |
| **Backend** | Express.js (API + landing page server) |
| **File Uploads** | Multer (avatars, media, attachments) |
| **Local Cache** | AsyncStorage with 14-day TTL for messages, threads, and feed posts |
| **Styling** | React Native StyleSheet with custom dark design system |
| **Fonts** | Inter (400, 500, 600, 700 weights via @expo-google-fonts) |
| **Animations** | React Native Reanimated |
| **Icons** | @expo/vector-icons (Ionicons, MaterialCommunityIcons) |
| **Haptics** | expo-haptics for tactile feedback |
| **Location** | expo-location (native), web geolocation API (web fallback) |
| **Keyboard** | react-native-keyboard-controller |

---

## Project Structure

```
shared/
└── schema.ts                # Drizzle ORM schema (17 tables) + Zod validation schemas

server/
├── index.ts                 # Express server entry with session middleware + WebSocket setup
├── routes.ts                # All API routes (auth, threads, messages, feed, settings, kindness, notifications, push-token, etc.)
├── storage.ts               # DatabaseStorage class (IStorage interface, all CRUD methods incl. notifications, push tokens, message status/deletion)
├── db.ts                    # Drizzle database connection pool
├── auth.ts                  # Password hashing (scrypt) + session auth helpers
├── websocket.ts             # WebSocket server (user tracking, typing, receipts, message broadcast, kindness/comment events, online/offline presence)
├── push.ts                  # Push notification service (Expo Push API)
├── uploads.ts               # Multer file upload middleware (avatar, media, attachment)
├── seed.ts                  # Demo data seeding (6 users, threads, messages, posts, comments, buddy connections, presence)
└── templates/
    └── landing-page.html    # Web landing page

app/
├── _layout.tsx              # Root layout with providers (Auth, QueryClient, Keyboard) + cache purge on start
├── index.tsx                # Welcome / landing screen (redirects if authed)
├── sign-in.tsx              # Sign in with username/password (API-backed)
├── sign-up.tsx              # Registration with username/password/display name
├── +not-found.tsx           # 404 error screen
├── edit-profile.tsx         # Edit profile (photo, bio, link, occupation, company, education CRUD)
├── new-message.tsx          # New message composer with user search (name/username/phone)
├── create-post.tsx          # Create feed post with audience picker (everyone/buddy/nearby)
├── nearby-list.tsx          # Nearby people list with message/add buddy/remove buddy actions
├── pricing.tsx              # Subscription plan selection (modal)
├── monetization.tsx         # Revenue center (Executive tier, API-backed)
├── offline.tsx              # Mesh mode / offline resilience
├── settings.tsx             # Privacy, notifications (push toggle), account settings (API-backed)
├── profile/
│   ├── _layout.tsx          # Profile stack layout
│   └── [id].tsx             # Public user profile (bio, link, posts, education, badges, message button)
├── chat/
│   └── [id].tsx             # Chat thread with optimistic send, delivery receipts, live typing preview, REDACTED deletion + local cache
└── (tabs)/
    ├── _layout.tsx          # Bottom tab navigation (5 tabs) + WebSocket connect/disconnect + notification badge
    ├── index.tsx            # Home dashboard (kindness score, plan, notification bell + notifications list)
    ├── live-field.tsx       # GPS proximity radar (buddy vs nearby toggle, real location)
    ├── feed.tsx             # Social feed with clickable user avatars/names, buddy/nearby filtering, kindness awards
    ├── messages.tsx         # Chat thread list with clickable avatars, compose button + local cache
    └── profile.tsx          # User profile with bio, link, kindness score + badges + sign out

components/
├── Avatar.tsx               # Initials-based avatar with optional neon glow
├── GlassCard.tsx            # Glassmorphism card component
├── GlowButton.tsx           # Glowing CTA button with haptic feedback
├── StatusChip.tsx           # Online/offline/encrypted status indicator
├── ErrorBoundary.tsx        # React error boundary wrapper
└── ErrorFallback.tsx        # Error fallback UI with restart

constants/
└── colors.ts                # Dark theme color system

lib/
├── auth-context.tsx         # Server-backed auth provider (React Query, sessions, graceful sign-out)
├── websocket.ts             # WebSocket client (connect, disconnect, auto-reconnect, sendTyping, sendMessageRead, onWsEvent/offWsEvent listener system)
├── query-client.ts          # React Query client with API base URL + default fetcher
├── local-cache.ts           # AsyncStorage-based local cache with 14-day TTL
├── push-notifications.ts    # Push notification registration, permission handling, notification listeners
└── mock-data.ts             # Legacy demo data (reference only, not imported by screens)
```

---

## Database Schema (PostgreSQL + Drizzle ORM)

Key tables in `shared/schema.ts`:

| Table | Purpose |
|-------|---------|
| `users` | Profiles with plan tier, kindness score, reputation, bio (200 char), link, isOnline, lastSeenAt, pushToken |
| `user_interests` | User interest tags |
| `user_badges` | Earned badges (Top Contributor, Verified Helper, etc.) |
| `message_threads` | Chat threads with encryption flag |
| `thread_participants` | Thread membership with unread counts |
| `messages` | Messages with status (sent/delivered/read), isDeleted, deliveredAt, readAt, deletedAt |
| `notifications` | In-app notifications (kindness_award, new_comment, new_message) with isRead flag |
| `feed_posts` | Social feed posts with audience (everyone/buddy/nearby) and kindnessEarned |
| `feed_comments` | Comments on posts with kindnessScore |
| `feed_reactions` | Post reactions (likes) with unique constraint per user per post |
| `kindness_ledger` | Kindness point history with actionType, actorUserId, targetType, targetId |
| `kindness_actions` | Cumulative kindness awards per user per target (bounded [-10, +10]) |
| `buddy_connections` | Friend/buddy relationships (bidirectional, status: pending/accepted) |
| `nearby_presence` | Location-based discovery data (lat/lng/lastSeen) |
| `events` | Hosted events (monetization) |
| `monetization_settings` | Inbox pricing and event hosting config |
| `user_settings` | Privacy and notification preferences |
| `session` | Express session store (connect-pg-simple) |

---

## API Routes

All data routes require session authentication (`req.session.userId`).

| Category | Endpoints |
|----------|-----------|
| **Auth** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| **Profile** | `GET /api/profile/:id`, `PATCH /api/profile`, `GET /api/profile/:id/posts` |
| **Search** | `GET /api/users/search?q=` (searches displayName, username, phone) |
| **Buddies** | `GET /api/buddies`, `POST /api/buddies/:id`, `DELETE /api/buddies/:id` |
| **Threads** | `GET /api/threads`, `POST /api/threads`, `GET /api/threads/:id/messages`, `POST /api/threads/:id/messages` |
| **Message Deletion** | `DELETE /api/threads/:threadId/messages/:messageId` (sender only; marks isDeleted, broadcasts via WS) |
| **Feed** | `GET /api/feed?type=buddy\|nearby`, `POST /api/feed` (with audience), `POST /api/feed/:id/like`, `POST /api/feed/:id/comment` |
| **Comments** | `GET /api/feed/:id/comments` |
| **Kindness Awards** | `POST /api/feed/:id/kindness` (±10 on post), `POST /api/feed/comments/:id/kindness` (±10 on comment, post owner only) |
| **Kindness Delta** | `GET /api/feed/:id/my-kindness` (user's cumulative delta on post), `GET /api/feed/comments/:id/my-kindness` (on comment) |
| **Kindness History** | `GET /api/kindness/history` |
| **Notifications** | `GET /api/notifications`, `POST /api/notifications/:id/read`, `GET /api/notifications/unread-count` |
| **Push Token** | `POST /api/push-token` (stores/clears Expo push token) |
| **Nearby** | `GET /api/nearby?type=buddy\|nearby&radius=400`, `POST /api/nearby/update` |
| **Settings** | `GET /api/settings`, `PATCH /api/settings` |
| **Monetization** | `GET /api/monetization`, `PATCH /api/monetization` |
| **Upload** | `POST /api/upload/avatar`, `POST /api/upload/media`, `POST /api/upload/attachment` |

### Security
- Thread message routes enforce participant authorization (IDOR protection)
- WebSocket broadcasts are scoped to thread participants only
- Settings/monetization updates use allowlisted field validation
- Upload routes require authentication
- Session cookies use `secure: true` in production
- Kindness award operations use PostgreSQL advisory locks + transactions to prevent race conditions

---

## WebSocket Events

Server-to-client and client-to-server event types:

| Event | Direction | Payload |
|-------|-----------|---------|
| `auth` | C→S | `{ userId }` |
| `typing` | C→S, S→C | `{ threadId, userId, text }` — live keystroke preview |
| `message_read` | C→S | `{ threadId }` — mark messages as read |
| `new_message` | S→C | `{ threadId, message }` — new message received |
| `message_delivered` | S→C | `{ threadId, messageId }` — delivery confirmation |
| `messages_read` | S→C | `{ threadId, readByUserId }` — read receipt |
| `message_deleted` | S→C | `{ threadId, messageId }` — message deletion |
| `kindness_awarded` | S→C | `{ postId, delta, newKindnessScore }` — kindness update |
| `new_comment` | S→C | `{ postId, comment }` — new comment on post |
| `new_notification` | S→C | `{ notification }` — in-app notification |

---

## Design System

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#0A0A0F` | Deep black app background |
| Surface | `#12121A` | Card and elevated surfaces |
| Accent Blue | `#00AAFF` | Messaging, actions, interactive elements |
| Accent Green | `#00FF88` | Kindness, resilience, online state, rewards |
| Accent Cyan | `#00E5FF` | Monetization, revenue, premium features |
| Warning | `#FFB800` | Upgrades, offline alerts, premium badges |
| Offline Red | `#FF4444` | Disconnected state, errors, negative kindness |
| Glass Border | `rgba(255,255,255,0.08)` | Subtle card borders |
| Glass Background | `rgba(255,255,255,0.04)` | Translucent card fills |

### Typography

- **Inter 700 Bold** — Headlines, scores, prices
- **Inter 600 SemiBold** — Section titles, buttons, badges
- **Inter 500 Medium** — Labels, chips, secondary text
- **Inter 400 Regular** — Body text, descriptions, timestamps

---

## Features

### Authentication
- Username + password registration and login
- PostgreSQL-backed sessions with connect-pg-simple
- Scrypt password hashing (Node.js built-in crypto)
- Session persistence across page reloads
- Auth guard on protected routes
- Graceful sign-out (navigate first, cancel in-flight queries)
- Demo credentials: `alexchen` / `demo1234`

### Home Dashboard
- Current plan badge (Temp/Associate/Executive)
- Online/offline status indicator
- Kindness score preview with heart icon
- Quick action grid (Messages, Nearby, Revenue, Mesh)
- Kindness score with reputation progress bar
- Notification bell with unread count badge
- Notifications list (kindness awards, comments, messages)
- Recent activity feed with point badges
- Monthly revenue card (Executive users)

### Messaging
- Thread list with profile avatars and unread badges
- Search/filter threads
- E2E encryption indicator chips
- Online/offline mode chips per contact
- **New Message Composer** — search users by name, @username, or phone number
- **Optimistic Send** — messages appear instantly with temp ID, replaced on server response
- **Delivery Receipts** — single gray check (sent), double gray checks (delivered), blue double checks (read)
- **Live Typing Preview** — other user sees characters typed/backspaced in real-time ghost bubble (throttled 100ms)
- **Message Deletion** — long-press to delete own messages; shows "REDACTED" with classified stamp
- **REDACTED Style** — dark red/amber tint, lock icon, "CLASSIFIED" timestamp
- WebSocket realtime message delivery
- Messages persist in PostgreSQL
- Local cache with 14-day TTL

### User Search & Buddy System
- Search users by display name, @username, or phone number
- Debounced search with real-time results
- Online/offline status indicators on search results
- Add/remove buddy connections from nearby people list
- Bidirectional buddy relationships (both directions stored)

### Live Field Discovery
- Radar visualization with concentric proximity rings
- **Real GPS integration** — uses device location (expo-location on native, web geolocation API)
- GPS status indicator in header (green = granted, gray = fallback)
- Nearby user avatars positioned by distance and angle
- Distance labels (meters) on each user
- Online glow indicators on radar avatars
- Toggle between **Buddy Feed** (only buddies) and **Nearby Feed** (non-buddies)
- Bottom bar showing context-aware count ("3 buddies nearby" vs "6 people nearby")
- **Tappable bottom bar** opens full nearby people list
- Radius indicator (400m default, expandable with premium tiers)

### Phone Feed
- Toggle between Buddy List and Nearby feeds
- Post types: text, image, video, audio, document
- Media preview cards with type-specific icons
- **Kindness display**: Positive → green `+N Kindness`, Negative → red `-N Kindness`, Zero → grey `0 Kindness`
- **Kindness award buttons** (+10 / -10) on posts by other users; buttons disable at per-user limits
- **Comment kindness** — post owner can award ±10 on comments; bounded [-10, +10] per user per comment
- Like/comment/share action row
- **Pull-to-refresh** on both buddy and nearby feeds
- Real-time WebSocket updates for kindness awards and new comments
- Haptic feedback on interactions
- Glass card styling per post
- Posts and comments persist in PostgreSQL

### Notifications
- In-app notification bell on home screen with unread count badge
- Notification list with kindness awards, new comments, new messages
- Mark individual notifications as read
- Push notifications via expo-notifications (native devices)
- Push notification permission toggle (starts OFF per Expo guidelines)
- Server-side push via Expo Push API for messages, kindness, comments
- Real-time WebSocket delivery of new notifications

### Profile
- Neon-bordered halo avatar with profile picture
- @username display
- **Bio** — 200-character editable bio displayed under username
- **Link** — tappable URL displayed under bio (opens in browser)
- Lifetime Kindness Score (large number display)
- Reputation level progress bar (gradient blue-to-green)
- Work & Education info (occupation, company, schools)
- Badge row (Top Contributor, Verified Helper, Community Leader)
- Connection stats (Connections, Messages, Events)
- Recent Activity feed with point history
- Edit Profile button (photo, bio, link, work, education)
- Upgrade Plan button
- Sign Out action

### Public User Profiles
- **Tap any avatar or username** in the feed, messages, live field, or chat header to view that user's profile
- Full profile view: avatar, bio, link, work/education, kindness score, reputation, badges
- **User's posts** displayed on their profile with kindness and engagement stats
- Message button to start a conversation with the user
- If viewing your own profile, shows edit button instead

### Monetization Center (Executive Tier)
- **Inbox Pricing** — Toggle on/off, set price per message from non-contacts
- **Event Hosting** — Create paid events with price slider ($15-$150)
- **Revenue Overview** — Bar chart showing monthly revenue growth
- **Withdraw** button for payout initiation
- Revenue amount display with "this month" label
- Settings persist in PostgreSQL

### Subscription Plans

| Plan | Price | Key Features |
|------|-------|-------------|
| **Temp** | Free | Basic messaging, local feed, standard profile |
| **Associate** | $4.99/mo | Extended radius 800m, custom badge, analytics, priority support |
| **Executive** | $14.99/mo | Inbox monetization, event hosting, verified status, premium analytics |
| **Offline Resilience** | $19.99/yr | Mesh messaging, emergency broadcast, offline file transfer |

### Offline Resilience
- Internet Connection Lost status display
- Mesh Mode Active indicator with network icon
- Nearby relay count and availability
- Signal strength bars with range display
- Message queue showing pending and delivered counts
- Upgrade CTA for Resilience Plan

### Settings
- **Privacy Controls**: Ghost mode, interest-based discovery, mutual filtering, see-everyone (premium)
- **Notifications**: Push notification toggle, message alerts, feed updates, kindness points
- **Account**: Subscription management, monetization settings, offline resilience
- Settings persist in PostgreSQL

---

## Kindness Economy

The kindness economy rewards positive community behavior with bounded, cumulative tracking:

| Action | Points | Rules |
|--------|--------|-------|
| Like a post | +5 | One-time per user per post (not on own posts) |
| Award post kindness | ±10 | Cumulative per user per post, bounded [-10, +10]; not on own posts |
| Award comment kindness | ±10 | Cumulative per user per comment, bounded [-10, +10]; post owner only |

### How Kindness Awards Work

- Users can press +10 or -10 multiple times on a post or comment
- Each user's cumulative delta per target is tracked and bounded to [-10, +10]
- Example: User presses +10 (total: +10), then -10 (total: 0), then -10 again (total: -10) — further -10 is blocked
- Buttons visually disable at limits; error toast appears when bounds are hit
- Awards update the target's kindness score and the owner's user kindness score
- All awards trigger WebSocket events, in-app notifications, and push notifications
- Atomic operations using PostgreSQL advisory locks + transactions prevent race conditions

### Kindness Display

- **Positive score**: Green badge with `+N Kindness`
- **Negative score**: Red badge with `-N Kindness`
- **Zero score**: Grey badge with `0 Kindness`

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (auto-provisioned on Replit)
- Expo Go app on your mobile device (for testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/njayco/phonemsgr.git
cd phonemsgr

# Install dependencies
npm install

# Start the backend server (port 5000)
npm run server:dev

# Start the Expo dev server (port 8081)
npm run expo:dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session signing secret |
| `EXPO_PUBLIC_DOMAIN` | Backend domain for API requests (injected at dev/build time) |

### Demo Data
On first startup, the database is seeded with 6 demo users, chat threads, messages, feed posts, comments, and buddy connections. Use `alexchen` / `demo1234` to sign in.

### Testing on Device
1. Install **Expo Go** from the App Store or Google Play
2. Scan the QR code shown in the terminal
3. The app will load on your device with hot module reloading

### Web Preview
Open `http://localhost:8081` in your browser for the web version.

---

## Local Cache (14-day TTL)

- `lib/local-cache.ts` provides `cacheSet`, `cacheGet`, `cacheInvalidate`, `cachePurgeExpired`
- Used in: feed.tsx (feed posts by tab), messages.tsx (thread list), chat/[id].tsx (messages per thread)
- Cache is purged on app start via `cachePurgeExpired()` in _layout.tsx
- Shows cached data immediately while API refetch runs in background

---

## Offline / Resilience Architecture

> **Important:** The Expo MVP simulates resilience mode using local state and AsyncStorage. Actual Bluetooth or WiFi Direct mesh networking requires native module development beyond Expo Go capabilities.

### Current MVP
- Local message queue simulation using AsyncStorage
- Connectivity mode UI (Online, Degraded, Mesh, Reconnecting)
- Nearby relay count display
- "Delivered via Local Relay" message badges
- Queued/pending message status indicators

### Future Native Implementation
The codebase is architected with clean service boundaries for future integration:
- **BitChat-based protocol** for real offline mesh routing
- **Bluetooth Low Energy** peer discovery and message relay
- **WiFi Direct** for higher-bandwidth local transfers
- **Emergency broadcast** for disaster scenarios
- Service interfaces ready at `modules/offline/` level

---

## Business Model

Phone Msgr generates revenue through:

1. **Premium Subscriptions** — Associate ($4.99/mo) and Executive ($14.99/mo) tiers
2. **Monetized Messaging** — Executive users charge for inbound messages from non-contacts
3. **Paid Events** — Event hosting with ticket pricing ($15-$150)
4. **Utility Fees** — Cable (fax-like utility) at $1.99/send, AirDrop-style transfers
5. **Offline Resilience Add-on** — $19.99/year for mesh networking and emergency features

---

## Roadmap

### Phase 1 — MVP
- [x] Authentication flow (phone + username)
- [x] Home dashboard with kindness score
- [x] Direct messaging with BEAM send
- [x] Live Field proximity radar
- [x] Phone Feed social timeline
- [x] User profile with badges
- [x] Monetization center UI
- [x] Pricing / subscription plans UI
- [x] Offline resilience simulation
- [x] Settings and privacy controls
- [x] Premium dark futuristic design system

### Phase 2 — Backend Integration
- [x] PostgreSQL database with Drizzle ORM (17 tables)
- [x] Session-based authentication with scrypt password hashing
- [x] All REST API routes with session middleware
- [x] All frontend screens using React Query with real API data
- [x] WebSocket realtime message delivery (scoped to thread participants)
- [x] File upload support (avatars, media, attachments)
- [x] Thread authorization and IDOR protection
- [x] Allowlisted field validation on settings/monetization updates
- [x] Demo data seeding (6 users, threads, messages, posts)

### Phase 3 — Payments & Verification
- [ ] Stripe integration for subscriptions
- [ ] Twilio Verify for phone number OTP
- [ ] In-app purchase flow
- [ ] Revenue payout processing

### Phase 4 — Advanced Features
- [ ] Real E2E encryption with key management
- [ ] Chat export (.docx, PDF formats)
- [ ] Content moderation system
- [ ] Advanced analytics dashboard

### Phase 5 — Realtime & Notifications (Completed)
- [x] Optimistic send with temp IDs
- [x] WhatsApp-style delivery receipts (✓ ✓✓ blue ✓✓)
- [x] Live keystroke typing preview (throttled 100ms)
- [x] REDACTED message deletion with classified stamp
- [x] Real-time kindness/comment WebSocket events
- [x] In-app notification bell + notifications list
- [x] Push notifications via expo-notifications (native)
- [x] Expo Push API (server-side)
- [x] Cumulative kindness awards bounded [-10, +10] with atomic transactions
- [x] Kindness display colors (green positive, red negative, grey zero)
- [x] Pull-to-refresh on feed
- [x] Local cache with 14-day TTL (messages, threads, feed posts)

### Phase 5.5 — Profiles & Social Navigation (Completed)
- [x] User bio (200 characters) with character counter
- [x] User link with tappable URL display
- [x] Profile picture upload with image picker
- [x] Work (occupation, company) on profile
- [x] Education CRUD (high school, college, degree, major, graduation year)
- [x] Public user profiles — tap avatar/name in feed, messages, live field, or chat header
- [x] User's posts displayed on their profile
- [x] Message button on other users' profiles
- [x] Edit button on own profile view

### Phase 6 — Native Offline / Mesh
- [ ] Native module for Bluetooth mesh networking
- [ ] BitChat protocol integration
- [ ] WiFi Direct peer discovery
- [ ] Emergency broadcast system
- [ ] Offline file transfer

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run expo:dev` | Start Expo development server (port 8081) |
| `npm run server:dev` | Start Express backend server (port 5000) |
| `npm run db:push` | Push Drizzle schema to PostgreSQL |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |

---

## Environment

- **Expo SDK**: 54
- **React Native**: 0.81.5
- **TypeScript**: 5.9
- **Node.js**: 18+
- **PostgreSQL**: Replit built-in

---

## Contributing

Phone Msgr is developed by Denoko Inc. Contributions are welcome via pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

Copyright 2026 Denoko Inc. All rights reserved.

---

## Contact

- **Organization**: [Denoko Inc.](https://github.com/njayco)
- **Product**: Phone Msgr 2026
- **Tagline**: Connect. Earn Kindness. Stay Resilient.

---

*Built with React Native, Expo, and TypeScript. Designed for the future of local, kind, and resilient communication.*
