# Onyx Messenger — Product & Technical Specification

## 1. Product goal

**Onyx** is a cross-platform messenger for personal and group communication with reliable realtime messaging, media exchange, notifications, and a scalable backend.

Core principles:
- Fast and stable UX similar to Telegram/WhatsApp.
- Security by default (TLS, session control, account protection).
- Architecture designed for growth up to millions of users.

---

## 2. Scope and platforms

### MVP (mandatory)
- Mobile clients: **iOS + Android**
- Backend + admin panel
- Push notifications (APNS/FCM)
- i18n: at least **English + Russian**

### v1 (recommended)
- Web client (PWA or SPA)
- Desktop client (optional)

### Suggested technology stack
- Mobile: Flutter or React Native (or native for top UX)
- Backend: Go/Java/Kotlin/Node, event-driven
- Realtime: WebSocket, internal gRPC
- Storage: PostgreSQL + Redis + S3-compatible object storage
- Eventing: Kafka / RabbitMQ / NATS

---

## 3. Roles and domain model

### Roles
- User
- Administrator (moderation/support/analytics)
- System operator (DevOps/access)

### Core entities
- Account
- Profile
- Contact
- Chat
- Message
- Attachment
- DeviceSession
- NotificationToken
- Report / Block

---

## 4. Functional requirements (MVP)

### 4.1 Authentication & authorization
- Primary auth: phone + OTP, with optional email.
- Alternative: email + password + email verification.
- OTP protections: retry limits, cooldown, anti-fraud checks.
- Optional app PIN.
- Device/session management: list sessions + force logout.

### 4.2 User profile
- Required display name.
- Optional unique username.
- Avatar and optional “about/status”.
- Privacy settings for phone/online/avatar visibility.

### 4.3 Contacts
- Address book import (permission-based).
- Discover by username/phone (if allowed by privacy settings).
- Start dialog from contacts.
- User blocking.

### 4.4 Chats
- 1:1 private chats.
- Group chats (MVP cap e.g. 200 members).
- Group operations: create/rename, add/remove members, owner/admin/member roles.

### 4.5 Messages
Supported content in MVP:
- Text
- Emoji
- Media (photo/video)
- Files (documents)

Behavior:
- Delivery states: `sent`, `delivered`, `read`
- Edit window (e.g. 15 minutes)
- Delete “for me” and “for everyone” with time limits
- Reply and forward
- Optional MVP+: reactions (3–5)

Synchronization requirements:
- Realtime transport via WebSocket
- Client offline queue
- Retry after reconnect
- Idempotent send commands (`client_message_id`) to prevent duplicates

### 4.6 Notifications
- Push for new messages.
- Notification settings: global/chat-level mute.
- Silent chat presets: 1h / 8h / forever.

### 4.7 Search
- Chat list search.
- In-chat message search (global search in v1).

### 4.8 Privacy and account controls
- Who can see online status.
- Who can contact the user.
- Blacklist.
- Account deletion and data removal.

---

## 5. v1 extensions
- Channels + comments
- Sticker packs / GIF
- Voice messages
- Audio/video calls (WebRTC)
- Multi-device support
- Advanced search
- E2E encrypted private chats
- Bot platform and integrations (complex, later)

---

## 6. Security requirements

### MVP
- TLS everywhere.
- Encryption at rest for sensitive server-side data.
- Password hashing with Argon2 or bcrypt (if passwords used).
- Short-lived access tokens + refresh token flow.
- Rate limits for registration/login/message sending.
- Basic anti-spam/anti-abuse controls.

### v1
- E2E encryption in private chats (Signal-like protocol).
- Device/key verification (safety numbers).
- Key re-sync flows for multi-device support.

---

## 7. Non-functional requirements

### Performance targets
- Message delivery: p95 < 500 ms under normal network.
- Chat list open time: < 1 second on average devices.
- Smooth chat scrolling (target 60 FPS).

### Reliability
- Backend SLA target: 99.9%.
- Retries + DLQ for failed async operations.
- Daily backups + PITR for DB.

### Scalability
- Horizontally scalable gateway layer for WebSocket.
- Service split by domains (auth, messaging, media, notifications).

### Observability
- Centralized logging.
- Metrics via Prometheus/Grafana.
- Tracing via OpenTelemetry.

---

## 8. Logical architecture

Services:
- API Gateway (REST)
- Realtime Gateway (WebSocket)
- Auth Service
- User/Profile Service
- Messaging Service
- Media Service (upload/preview/virus scan)
- Notification Service
- Moderation/Abuse Service
- Admin Panel

Data systems:
- PostgreSQL for core metadata
- Object storage for media/files
- Redis for presence/rate-limit/cache/temporary OTP
- Message queue/stream for fanout and notifications

---

## 9. API and protocol requirements

### Core domain events
- `MessageCreated`
- `MessageDelivered`
- `MessageRead`
- `MessageEdited`
- `MessageDeleted`
- `UserTyping` / `Presence` (optional)

### API constraints
- Versioned API (`/v1`).
- Idempotent write commands with `client_message_id`.
- Stable protobuf/JSON schemas with contract tests.

---

## 10. UX / UI baseline (MVP)

Mandatory screens:
- Onboarding/login
- Contacts permission prompt
- Chat list with unread badge + last message preview
- Chat screen with bubbles, dates, delivery states
- Profile view
- Group creation
- Settings (privacy/notifications)
- Search (chats + in-chat messages)

Required behavior:
- Pull-to-refresh.
- Infinite scroll for older history.
- Explicit offline/network state indication.
- Optional typing indicator in v1.

---

## 11. Admin panel (MVP)
- Search users by id/phone/username.
- Review reports.
- Temporary/permanent user block.
- Chat/group moderation block (if needed).
- Basic metrics: DAU/MAU, messages sent, errors, signups.
- User-level event log (minimal).

---

## 12. Analytics events (MVP)
- `SignupStarted`, `SignupCompleted`
- `LoginSuccess`, `LoginFail`
- `ChatCreated`, `GroupCreated`
- `MessageSent`, `Delivered`, `Read`
- `AttachmentUploaded`
- `PushReceived`, `PushOpened`
- Crash logs (Sentry or equivalent)

---

## 13. Testing and acceptance

### Required testing layers
- Unit tests (backend + mobile)
- Integration tests (API + DB)
- Contract tests (client/server schema compatibility)
- E2E happy path (auth → chat → message → attachment)
- Load tests (minimum 5k–10k concurrent connections)
- Security checks: OWASP baseline, OTP brute-force resilience, rate limits

### MVP acceptance criteria
- User can sign up/login.
- User can create 1:1 chat and exchange realtime messages.
- User can create group, manage participants, and message in group.
- Media/file sending and retrieval works.
- `delivered/read` statuses are correct.
- Push notifications are delivered.
- Client tolerates network drops with queue/retry.
- Admin can block user and review reports.

---

## 14. Environments and delivery
- Environments: `dev`, `staging`, `prod`
- CI/CD for mobile builds + backend deployments
- Feature flags for gradual rollout
- DB migrations via Flyway/Liquibase/Atlas

---

## 15. Delivery strategy and constraints
A Telegram/WhatsApp-level product must be shipped incrementally:
1. **MVP:** core chats + media + push + admin.
2. **v1:** multi-device, voice messages, advanced search.
3. **v2:** E2E by default, calls, channels/bots.

This phased approach controls risk while preserving a scalable architecture from day one.
