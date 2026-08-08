---
name: Direct to Talk voice design
description: Why walkie-talkie voice uses segmented audio over the existing WebSocket instead of WebRTC
---

- Real-time voice uses short recorded audio segments relayed over the existing WebSocket, not WebRTC. **Why:** react-native-webrtc is not Expo Go compatible and the app must run in Expo Go and the web preview; segment relay works everywhere with ~1s latency. **How to apply:** do not "upgrade" to WebRTC without moving off Expo Go; keep the server as the single authority on who holds the voice channel.
- Realtime connections must derive identity from the verified server session, never a client-supplied user ID. **Why:** live audio makes asserted identity an eavesdropping vector. **How to apply:** any new realtime feature should reuse the connection's verified identity; the dev/preview frontend and backend hosts are same-site, so session cookies flow on the WebSocket handshake.
