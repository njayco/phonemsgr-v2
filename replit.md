# Phone Msgr 2026 - Kindness-Based Social Messenger

## Overview
Phone Msgr is a kindness-based social messenger mobile app designed to foster local social connections and community engagement. It features secure messaging, real-time interactions, and a futuristic dark UI. The project aims to provide a platform for positive social interactions, incorporating a "kindness economy" to reward prosocial behavior. Key capabilities include instant messaging with advanced delivery features, real-time updates via WebSockets, in-app and push notifications, and a social feed with interactive elements. The business vision is to create a unique social networking experience focused on local community building and positive reinforcement.

## User Preferences
I prefer simple language and clear, concise explanations.
I want iterative development with frequent, small updates.
Please ask for my confirmation before implementing any major architectural changes or feature removals.
When making changes, prioritize performance and security.
Do not make changes to the `shared/schema.ts` file without explicit approval, as it defines core data structures.
Ensure all new features are accompanied by clear documentation or examples.

## System Architecture
The application is built with a React Native frontend (Expo SDK 54, Expo Router) and an Express.js backend (TypeScript) serving an API and a landing page. PostgreSQL with Drizzle ORM is used for the database. Authentication is handled via Express sessions with `connect-pg-simple` and `scrypt` for password hashing. Real-time communication for messaging, typing previews, delivery receipts, kindness updates, and notifications is powered by WebSockets (`ws` package). Push notifications leverage `expo-notifications` and the Expo Push API, with an in-app fallback. State management uses React Query for server state and React Context for authentication. Local caching (AsyncStorage with 14-day TTL) is implemented for messages, threads, and feed posts. File uploads (avatars, media) use Multer. Location services are provided by `expo-location` with a web geolocation API fallback. The UI adopts a premium futuristic dark theme with neon green/blue accents and Inter font.

**Key Features Implemented:**
- **Messaging:** Optimistic send, WhatsApp-style delivery receipts (sent, delivered, read), live keystroke typing preview, "REDACTED" message deletion.
- **Social Feed:** Posts with audience targeting (everyone, buddy, nearby), comments, kindness awards, real-time updates.
- **Kindness Economy:** Users can award kindness points to posts and comments, affecting kindness scores and triggering notifications.
- **Notifications:** In-app and push notifications for new messages, kindness awards, and comments.
- **User Management:** Profile editing, user search, buddy connections, nearby user discovery.
- **Monetization:** Subscription plans and a revenue center for Executive users.
- **Offline Resilience:** Mesh mode for offline functionality.

**Design System:**
- **Color Scheme:** Deep black background (`#0A0A0F`), various shades of dark surfaces, accent blues (`#00AAFF`), greens (`#00FF88`), and cyans (`#00E5FF`). Warning elements use `#FFB800`.
- **UI Components:** Glassmorphism cards with `rgba` borders and subtle backgrounds, initial-based avatars with optional glow, glowing CTA buttons.

**Technical Implementations:**
- **Auth:** Session-based authentication with `userId` stored in `req.session`.
- **Database Schema:** Comprehensive schema covering users, messages, threads, posts, comments, kindness ledger, notifications, and user settings. Key fields include message `status` (`sent/delivered/read`), `isDeleted`, and feed `audience`.
- **API Endpoints:** RESTful API for all major features (auth, threads, feed, notifications, push tokens, user profiles, search, buddies, kindness, nearby, settings, monetization, uploads, downloads). All data routes require session authentication.
- **WebSocket Protocol:** Defined events for authentication, typing, message status updates (read, delivered, deleted), new messages, kindness awards, and new comments/notifications.
- **Push Notifications:** Handled server-side via Expo Push API for native clients; in-app for web. Token management through a dedicated API endpoint.
- **Local Cache:** `AsyncStorage` with a 14-day TTL for performance optimization, particularly for feeds and chat history. Purged on app start.

## External Dependencies
- **Database:** PostgreSQL (Replit built-in)
- **ORM:** Drizzle ORM
- **Authentication Session Store:** `connect-pg-simple`
- **Password Hashing:** `scrypt`
- **Real-time Communication:** `ws` (WebSocket package)
- **Push Notifications:** `expo-notifications` (client), Expo Push API (server)
- **State Management:** React Query
- **Local Storage:** `AsyncStorage` (React Native community package)
- **File Uploads:** Multer
- **Location Services:** `expo-location`
- **Web Framework:** Express.js