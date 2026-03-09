# Phone Msgr 2026

**The Kindness-Based Social Messenger for Real Life — Online or Offline**

Phone Msgr is a kindness-based social messenger that helps people connect locally, communicate securely, and stay reachable online or offline. Built by [Denoko Inc.](https://github.com/njayco) (A Denoko Cooperative).

---

## Overview

Phone Msgr combines secure messaging, local social discovery, a kindness economy, creator monetization tools, and future-ready offline resilience into a single premium mobile experience.

### Key Pillars

- **Messaging & Identity** — Encrypted direct messaging with BEAM send, E2E-ready architecture, and phone-number-based identity
- **Live Field Discovery** — Proximity-based radar showing nearby users, shared interests, and distance labels
- **Phone Feed** — Social content timeline with Buddy and Nearby feeds, media attachments, and kindness rewards
- **Kindness Economy** — Earn and track kindness points through positive community interactions
- **Monetization Center** — Inbox pricing, paid events, revenue dashboards, and creator tools (Executive tier)
- **Offline Resilience** — Future mesh networking layer for communication during internet disruption

---

## Screenshots & Design

The app features a premium futuristic dark theme with neon green and blue accents, glassmorphism cards, and a sci-fi consumer app aesthetic. Key screens include:

| Screen | Description |
|--------|-------------|
| **Welcome** | Cinematic onboarding with "Connect. Earn Kindness. Stay Resilient." tagline |
| **Home Dashboard** | Kindness score, plan status, quick actions, recent activity feed |
| **Live Field** | Radar/proximity map with nearby user avatars and interest chips |
| **Phone Feed** | Social timeline with video, image, audio, and document post types |
| **Messages** | Thread list with E2E encryption indicators and online/offline status |
| **Chat Thread** | Dark futuristic chat with BEAM send button and mesh delivery badges |
| **Profile** | Halo avatar, lifetime kindness score, reputation bar, badges, stats |
| **Monetization** | Revenue chart, inbox pricing controls, event hosting tools |
| **Pricing** | Three-tier subscription plans (Temp, Associate, Executive) |
| **Mesh Mode** | Offline resilience simulation with relay status and message queue |
| **Settings** | Ghost mode, discovery filters, notification and privacy controls |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native with Expo SDK 54 |
| **Language** | TypeScript |
| **Routing** | Expo Router (file-based routing) |
| **Database** | PostgreSQL with Drizzle ORM |
| **Auth** | Express sessions with connect-pg-simple, scrypt password hashing |
| **Realtime** | WebSocket (ws package) for live message delivery and presence |
| **Server State** | TanStack React Query |
| **Backend** | Express.js (API + landing page server) |
| **File Uploads** | Multer (avatars, media, attachments) |
| **Styling** | React Native StyleSheet with custom dark design system |
| **Fonts** | Inter (400, 500, 600, 700 weights via @expo-google-fonts) |
| **Animations** | React Native Reanimated |
| **Icons** | @expo/vector-icons (Ionicons, MaterialCommunityIcons) |
| **Haptics** | expo-haptics for tactile feedback |
| **Location** | expo-location (ready for Live Field discovery) |
| **Keyboard** | react-native-keyboard-controller |

---

## Project Structure

```
shared/
└── schema.ts                # Drizzle ORM schema (15 tables) + Zod validation schemas

server/
├── index.ts                 # Express server entry with session middleware + WebSocket setup
├── routes.ts                # All API routes (auth, threads, messages, feed, settings, etc.)
├── storage.ts               # DatabaseStorage class (IStorage interface, all CRUD methods)
├── db.ts                    # Drizzle database connection pool
├── auth.ts                  # Password hashing (scrypt) + session auth helpers
├── websocket.ts             # WebSocket server (user tracking, message broadcast, presence)
├── uploads.ts               # Multer file upload middleware (avatar, media, attachment)
├── seed.ts                  # Demo data seeding (6 users, threads, messages, posts)
└── templates/
    └── landing-page.html    # Web landing page

app/
├── _layout.tsx              # Root layout (Auth, QueryClient, Keyboard providers)
├── index.tsx                # Welcome / landing screen (redirects if authed)
├── sign-in.tsx              # Sign in with username/password (API-backed)
├── sign-up.tsx              # Registration with username/password/display name
├── +not-found.tsx           # 404 error screen
├── pricing.tsx              # Subscription plan selection (modal)
├── monetization.tsx         # Revenue center (Executive tier, API-backed)
├── offline.tsx              # Mesh mode / offline resilience
├── settings.tsx             # Privacy, notifications, account settings (API-backed)
├── chat/
│   └── [id].tsx             # Individual chat thread with BEAM send (real messages API)
└── (tabs)/
    ├── _layout.tsx          # Bottom tab navigation (5 tabs) + WebSocket connect/disconnect
    ├── index.tsx            # Home dashboard (kindness score, plan, recent activity)
    ├── live-field.tsx       # Proximity radar discovery (nearby users API)
    ├── feed.tsx             # Social feed with like/comment (Buddy/Nearby toggle)
    ├── messages.tsx         # Chat thread list (real threads from API)
    └── profile.tsx          # User profile with kindness score + badges

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
├── auth-context.tsx         # Server-backed auth provider (React Query, sessions)
├── websocket.ts             # WebSocket client (connect, disconnect, auto-reconnect)
├── query-client.ts          # React Query client with API base URL + default fetcher
└── mock-data.ts             # Legacy demo data (reference only, not imported by screens)
```

---

## Database Schema (PostgreSQL + Drizzle ORM)

Key tables in `shared/schema.ts`:

| Table | Purpose |
|-------|---------|
| `users` | Profiles with plan tier, kindness score, reputation |
| `user_interests` | User interest tags |
| `user_badges` | Earned badges (Top Contributor, Verified Helper, etc.) |
| `message_threads` | Chat threads with encryption flag |
| `thread_participants` | Thread membership with unread counts |
| `messages` | Individual messages with mesh delivery flag |
| `feed_posts` | Social feed posts with media types |
| `feed_comments` | Comments on posts |
| `feed_reactions` | Post reactions (likes) |
| `kindness_ledger` | Kindness point history |
| `buddy_connections` | Friend/buddy relationships |
| `nearby_presence` | Location-based discovery data |
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
| **Profile** | `GET /api/profile/:id`, `PATCH /api/profile` |
| **Threads** | `GET /api/threads`, `POST /api/threads`, `GET /api/threads/:id/messages`, `POST /api/threads/:id/messages` |
| **Feed** | `GET /api/feed`, `POST /api/feed`, `POST /api/feed/:id/like`, `POST /api/feed/:id/comment` |
| **Kindness** | `GET /api/kindness/history` |
| **Nearby** | `GET /api/nearby`, `POST /api/nearby/update` |
| **Settings** | `GET /api/settings`, `PATCH /api/settings` |
| **Monetization** | `GET /api/monetization`, `PATCH /api/monetization` |
| **Upload** | `POST /api/upload/avatar`, `POST /api/upload/media`, `POST /api/upload/attachment` |

### Security
- Thread message routes enforce participant authorization (IDOR protection)
- WebSocket broadcasts are scoped to thread participants only
- Settings/monetization updates use allowlisted field validation
- Upload routes require authentication
- Session cookies use `secure: true` in production

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
| Offline Red | `#FF4444` | Disconnected state, errors |
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
- Demo credentials: `alexchen` / `demo1234`

### Home Dashboard
- Current plan badge (Temp/Associate/Executive)
- Online/offline status indicator
- Kindness score preview with heart icon
- Quick action grid (Messages, Nearby, Revenue, Mesh)
- Kindness score with reputation progress bar
- Recent activity feed with point badges
- Monthly revenue card (Executive users)

### Messaging
- Thread list with profile avatars and unread badges
- Search/filter threads
- E2E encryption indicator chips
- Online/offline mode chips per contact
- Chat thread with dark futuristic bubble styling
- Blue outgoing bubbles, dark glass incoming bubbles
- **BEAM** button replaces traditional "Send"
- Timestamps on every message
- "Delivered via Local Relay" badge for mesh-delivered messages
- WebSocket realtime message delivery
- Messages persist in PostgreSQL

### Live Field Discovery
- Radar visualization with concentric proximity rings
- Nearby user avatars positioned by distance and angle
- Distance labels (meters) on each user
- Shared interest chips per user
- Toggle between Buddy Feed and Nearby Feed
- Bottom bar showing total nearby count
- Radius indicator (400m default, expandable with premium tiers)

### Phone Feed
- Toggle between Buddy List and Nearby feeds
- Post types: text, image, video, audio, document
- Media preview cards with type-specific icons
- Kindness Earned badges per post (+points)
- Like/comment/share action row
- Haptic feedback on interactions
- Glass card styling per post
- Posts persist in PostgreSQL

### Profile
- Neon-bordered halo avatar
- @username display
- Lifetime Kindness Score (large number display)
- Reputation level progress bar (gradient blue-to-green)
- Badge row (Top Contributor, Verified Helper, Community Leader)
- Connection stats (Connections, Messages, Events)
- Recent Activity feed with point history
- Upgrade Plan button
- Sign Out action

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
- **Notifications**: Push, message alerts, feed updates, kindness points
- **Account**: Subscription management, monetization settings, offline resilience
- Settings persist in PostgreSQL

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
On first startup, the database is seeded with 6 demo users, chat threads, messages, and feed posts. Use `alexchen` / `demo1234` to sign in.

### Testing on Device
1. Install **Expo Go** from the App Store or Google Play
2. Scan the QR code shown in the terminal
3. The app will load on your device with hot module reloading

### Web Preview
Open `http://localhost:8081` in your browser for the web version.

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

Phone Msgr is a resilience communication product designed to keep people connected during infrastructure disruptions.

---

## Business Model

Phone Msgr generates revenue through:

1. **Premium Subscriptions** — Associate ($4.99/mo) and Executive ($14.99/mo) tiers
2. **Monetized Messaging** — Executive users charge for inbound messages from non-contacts
3. **Paid Events** — Event hosting with ticket pricing ($15-$150)
4. **Utility Fees** — Cable (fax-like utility) at $1.99/send, AirDrop-style transfers
5. **Offline Resilience Add-on** — $19.99/year for mesh networking and emergency features

---

## Kindness Economy

The kindness economy rewards positive community behavior:

| Action | Points |
|--------|--------|
| Kind comment | +10 |
| Like on a kind comment | +10 bonus |
| Post kindness budget | +100 per post |
| Harmful comment penalty | -10 (transferred to impacted user) |

> **Note:** Production deployment requires real moderation, abuse detection, and reputation integrity protections before the kindness economy goes live.

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
- [x] PostgreSQL database with Drizzle ORM (15 tables)
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
- [ ] Push notifications via expo-notifications
- [ ] Content moderation system
- [ ] Advanced analytics dashboard

### Phase 5 — Native Offline / Mesh
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
