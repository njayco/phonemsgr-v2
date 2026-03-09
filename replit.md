# Phone Msgr - Kindness-Based Social Messenger

## Overview
Phone Msgr is a kindness-based social messenger mobile app built with React Native / Expo. It enables local social connections, secure messaging, and community engagement with a premium futuristic dark UI aesthetic.

## Tech Stack
- **Frontend**: React Native, Expo SDK 54, TypeScript, Expo Router (file-based routing)
- **Backend**: Express.js (port 5000) serving API and landing page
- **State**: AsyncStorage for persistence, React Context for auth, React Query for server state
- **Styling**: React Native StyleSheet with custom dark theme (neon green/blue accents)
- **Fonts**: Inter (400, 500, 600, 700 weights)

## Project Structure
```
app/
  _layout.tsx              # Root layout with providers (Auth, Query, Keyboard)
  index.tsx                # Welcome/landing screen (redirects if authed)
  sign-in.tsx              # Sign in screen
  sign-up.tsx              # Sign up screen
  +not-found.tsx           # 404 screen
  (tabs)/
    _layout.tsx            # Tab navigation (Home, Live Field, Feed, Messages, Profile)
    index.tsx              # Home dashboard
    live-field.tsx         # Proximity radar discovery
    feed.tsx               # Social feed (Buddy/Nearby)
    messages.tsx           # Chat thread list
    profile.tsx            # User profile with kindness score
  chat/[id].tsx            # Chat thread with BEAM send
  pricing.tsx              # Subscription plans (modal)
  monetization.tsx         # Revenue center for Executive users
  offline.tsx              # Mesh mode / offline resilience
  settings.tsx             # Privacy, notifications, account settings

components/
  Avatar.tsx               # Initial-based avatar with optional glow
  GlassCard.tsx            # Glassmorphism card component
  GlowButton.tsx           # Glowing CTA button
  StatusChip.tsx           # Online/offline status chip
  ErrorBoundary.tsx        # Error boundary wrapper
  ErrorFallback.tsx        # Error fallback UI

constants/
  colors.ts                # Dark theme color system (green/blue neon accents)

lib/
  auth-context.tsx         # Auth provider with AsyncStorage persistence
  mock-data.ts             # Demo data for MVP (users, threads, posts, etc.)
  query-client.ts          # React Query client with API helpers

server/
  index.ts                 # Express server entry
  routes.ts                # API routes
  storage.ts               # In-memory storage
  templates/landing-page.html
```

## Key Features
- **Auth**: Phone number + username signup, AsyncStorage-based session
- **Home Dashboard**: Kindness score, plan status, quick actions, recent activity
- **Messaging**: Thread list with BEAM send, E2E encryption indicators, mesh delivery badges
- **Live Field**: Radar proximity map with nearby user avatars, interest matching
- **Phone Feed**: Social timeline with kindness rewards, multiple media types
- **Profile**: Kindness score, reputation level, badges, connection stats
- **Monetization**: Inbox pricing, event hosting, revenue charts (Executive tier)
- **Pricing**: Free/Associate/Executive tiers + Offline Resilience add-on
- **Offline Mode**: Mesh network simulation, message queue, relay status
- **Settings**: Ghost mode, discovery filters, notification preferences

## Design System
- Background: #0A0A0F (deep black)
- Surface: #12121A, #1A1A25
- Accent Blue: #00AAFF (messaging, actions)
- Accent Green: #00FF88 (kindness, resilience, online state)
- Accent Cyan: #00E5FF (monetization)
- Warning: #FFB800 (upgrades, offline)
- Glass cards with rgba borders and subtle backgrounds

## Workflows
- **Start Backend**: `npm run server:dev` (Express on port 5000)
- **Start Frontend**: `npm run expo:dev` (Expo on port 8081)
