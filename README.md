# Phone Msgr 2026

**The Kindness-Based Social Messenger for Real Life — Online or Offline**

Phone Msgr is a kindness-based social messenger that helps people connect locally, communicate securely, and stay reachable online or offline. Built by [Denoko Inc.](https://github.com/njayco) (A Denoko Cooperative).

---

## Overview

Phone Msgr combines secure messaging, local social discovery, a kindness economy, creator monetization tools, and future-ready offline resilience into a single premium mobile experience.

### Key Pillars

- **Messaging & Identity** — Instant messaging with optimistic send, WhatsApp-style delivery receipts (✓ ✓✓ blue ✓✓), live keystroke typing preview, and REDACTED message deletion
- **Direct to Talk** — Push-to-talk walkie-talkie voice channel inside any chat thread, with speaker contention, drain window delivery, and zombie-socket reaping
- **Live Field Discovery** — Proximity-based radar showing nearby users, shared interests, and distance labels
- **Phone Feed** — Social content timeline with Buddy and Nearby feeds, media attachments, kindness rewards, pull-to-refresh, and real-time updates
- **Rich Media** — Photo/video/audio/document sharing with HEIC support, view-once self-destructing images, GIF search (GIPHY), and an in-app image viewer
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
| **Chat Thread** | Optimistic send, delivery receipts, live typing preview, REDACTED deletion, Direct to Talk overlay |
| **Direct to Talk** | Push-and-hold voice overlay; radio-tone cue, speaker grant ack, live participant list |
| **Image Viewer** | Full-screen pinch-to-zoom viewer for chat and feed photos; view-once countdown |
| **GIF Picker** | GIPHY-powered search and send inside chat |
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
| **Realtime** | WebSocket (ws package) for live message delivery, typing, receipts, kindness events, notifications, presence, and Direct to Talk audio relay |
| **Voice** | Direct to Talk — segmented AAC/WAV audio relayed over WebSocket; push-to-talk with speaker contention and drain window |
| **Push Notifications** | expo-notifications (native), Expo Push API (server), in-app fallback (web) |
| **Server State** | TanStack React Query |
| **Backend** | Express.js (API + landing page server) |
| **File Uploads** | Multer (avatars, media, attachments); HEIC/HEIF supported; platform-aware fetch (native vs. web) |
| **GIFs** | GIPHY API |
| **Local Cache** | AsyncStorage with 14-day TTL for messages, threads, and feed posts |
| **Styling** | React Native StyleSheet with custom dark design system |
| **Fonts** | Inter (400, 500, 600, 700 weights via @expo-google-fonts) |
| **Animations** | React Native Reanimated |
| **Icons** | @expo/vector-icons (Ionicons, MaterialCommunityIcons) |

---

## Features In Detail

### Direct to Talk (DTT)
Push-and-hold walkie-talkie voice inside any chat thread.

- **Transport**: ~900 ms segmented audio clips (AAC/M4A on native, PCM WAV on web) base64-relayed over the existing WebSocket connection — no WebRTC required, works in Expo Go
- **Speaker contention**: Only one speaker at a time; the server grants the channel with an explicit `dtt_talk_granted` ack before recording starts
- **Drain window**: 2-second relay window after release ensures the final in-flight segment is delivered; cut immediately when another speaker claims the channel
- **Reconnect resilience**: Client rejoins the DTT session on every WebSocket reconnection; server prunes stale dead members automatically
- **Heartbeat**: 10-second ping/pong WebSocket heartbeat terminates zombie sockets
- **Security**: WS identity comes from the server-side session cookie (same `sessionMiddleware` used by Express routes); unauthenticated sockets are closed with code 4401

### Photo & Media Sharing
- Upload photos, videos, audio, and documents from chat or the feed composer
- **HEIC/HEIF support**: iOS native camera photos in HEIC format upload and display correctly
- **Platform-aware upload**: Native uses React Native's built-in `fetch` for FormData file uploads; web uses `expo/fetch`
- **Permission flow**: Media library permission is requested before opening the image picker on both iOS and Android
- **Unauthenticated image serving**: Regular uploaded files are served without a session cookie requirement so React Native `Image` components load them correctly; view-once files remain fully auth-protected
- **View-once**: Self-destructing images are deleted from disk after the 2-minute viewing window, with a periodic orphan sweep on server restart
- **GIF search**: GIPHY-powered picker in every chat thread

### WebSocket Security
- Session cookie read on the HTTP upgrade request via `sessionMiddleware`; no client-side `auth` message needed
- `buildWsUrl()` picks `ws://` for HTTP origins and `wss://` for HTTPS — works in plain-HTTP dev and TLS production without hardcoding

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run expo:dev` | Start Expo development server (port 8081) |
| `npm run server:dev` | Start Express backend server (port 5000) |
| `npm run server:build` | Bundle Express server to `server_dist/index.js` |
| `npm run db:push` | Push Drizzle schema to PostgreSQL |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |

### Test Scripts

| Script | Description |
|--------|-------------|
| `node scripts/dtt-integration-test.mjs` | 17-check live WebSocket integration test for Direct to Talk |
| `node scripts/ws-url-test.mjs` | 4-case regression test for WebSocket URL scheme selection |

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
