# Onyx Messenger MVP Monorepo

## Structure
- `backend/` — REST API + WebSocket realtime + PostgreSQL + Redis + MinIO integration
- `admin/` — web admin panel (user search, block, reports)
- `mobile/` — React Native (Expo) MVP client with OTP login, chat sending, minimal offline outbox
- `infra/` — docker compose stack for local development

## Run backend/admin infra
```bash
cd infra
docker compose up --build
```

Services:
- Backend API: `http://localhost:8080`
- WebSocket: `ws://localhost:8080/ws?token=...`
- Admin panel: `http://localhost:5173`
- MinIO console: `http://localhost:9001` (`minioadmin/minioadmin`)

## Auth flow (dev OTP)
1. `POST /v1/auth/otp/send` with `{ "phone": "+10000000001" }`
2. `POST /v1/auth/otp/verify` with `{ "phone": "+10000000001", "code": "123456", "name": "Alice" }`
3. Use `accessToken` as `Bearer`.

Admin user shortcut: login with phone `+10000000000` (same OTP code), role becomes `admin`.

## Mobile app
```bash
cd mobile
npm install
npm run start
```

Set API host in `mobile/src/api/client.js` if running on physical device.

## Backend tests
```bash
cd backend
npm install
npm test
```

## DB migrations
Migrations are in `backend/migrations`. Backend container auto-runs:
```bash
npm run migrate
```
