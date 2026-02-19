# Onyx Messenger MVP

Рабочий монорепозиторий:
- `backend/` — API + WebSocket + Postgres + Redis + MinIO
- `mobile/` — React Native (Expo), работает и как Web UI (`expo start --web`)
- `admin/` — Admin panel
- `infra/` — Docker Compose для dev

## 1) Запуск одной командой
```bash
cd infra
docker compose up -d --build
```

Проверка health:
```bash
curl http://localhost:8080/v1/health
```
Ответ:
```json
{ "ok": true }
```

## 2) Запуск web UI (mobile через Expo Web)
```bash
cd mobile
npm install
npm run start
# нажать w для web
```

## 3) Admin panel
После `docker compose up`:
- http://localhost:5173

## 4) Dev-аккаунты и OTP
- OTP код в dev: `123456`
- Любой новый номер создаёт пользователя.
- Номер `+10000000000` создаётся как `admin`.

## 5) Единый API контракт (camelCase)
Все API-ответы в JSON, ключи в `camelCase`:
- `peerUserId`, `clientMessageId`, `chatId`, `senderId`, `isBlocked`.

## 6) Минимальный рабочий флоу (curl)
### 6.1 Отправить OTP
```bash
curl -X POST http://localhost:8080/v1/auth/otp/send \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+10000000001"}'
```

### 6.2 Подтвердить OTP и получить token
```bash
curl -X POST http://localhost:8080/v1/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+10000000001","code":"123456","name":"Alice"}'
```

### 6.3 Создать второго пользователя
Повторить шаги с телефоном `+10000000002`, сохранить `user.id` как `peerUserId`.

### 6.4 Создать direct chat
```bash
curl -X POST http://localhost:8080/v1/chats/direct \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"peerUserId":"<USER2_ID>"}'
```

### 6.5 Отправить сообщение
```bash
curl -X POST http://localhost:8080/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"chatId":"<CHAT_ID>","clientMessageId":"m-1","body":"hello"}'
```

### 6.6 Прочитать историю
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/v1/messages/<CHAT_ID>
```

## 7) PowerShell примеры
```powershell
$send = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/v1/auth/otp/send" -ContentType "application/json" -Body '{"phone":"+10000000001"}'
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/v1/auth/otp/verify" -ContentType "application/json" -Body '{"phone":"+10000000001","code":"123456","name":"Alice"}'
$token = $login.accessToken
```

## 8) Тесты
```bash
cd backend
npm install
npm test
```

Интеграционные тесты покрывают:
- OTP send/verify
- create direct chat
- send message
- list messages

## 9) Основные endpoints
- `GET /v1/health`
- `POST /v1/auth/otp/send`
- `POST /v1/auth/otp/verify`
- `GET /v1/users/search?q=...`
- `GET /v1/chats`
- `POST /v1/chats/direct`
- `POST /v1/chats/group`
- `GET /v1/messages/:chatId`
- `POST /v1/messages`
- `POST /v1/messages/:chatId/:messageId/delivered`
- `POST /v1/messages/:chatId/:messageId/read`
- `POST /v1/media/upload`
- `POST /v1/moderation/report`
- `GET /v1/admin/users?q=...` (admin)
- `POST /v1/admin/users/:id/block` (admin)
- `GET /v1/admin/reports` (admin)
