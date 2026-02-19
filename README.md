# Onyx Telegram-like MVP

Полностью рабочий локальный MVP: **backend + web-client + postgres + redis + minio**.

## Быстрый старт (одной командой)
```bash
cd infra
docker compose up -d --build
```

## URLs
- Web client: http://localhost:5173
- Backend API: http://localhost:8080
- Health: http://localhost:8080/v1/health
- MinIO console: http://localhost:9001

Проверка health:
```bash
curl http://localhost:8080/v1/health
# {"ok":true}
```

## Тестовые аккаунты
- OTP code (dev): `123456`
- Примеры телефонов:
  - `+10000000000` (admin role)
  - `+10000000001`
  - `+10000000002`

## Как протестировать в UI
1. Открой http://localhost:5173
2. Введи телефон -> **Send code**
3. Введи OTP `123456` -> **Continue**
4. В поиске слева найди второго пользователя по телефону и создай direct chat
5. Открой чат и отправь сообщение
6. Вложения: скрепка в композере -> файл -> отправка

## API contracts (camelCase)
- `POST /v1/auth/otp/send { phone } -> { ok, phone, code }`
- `POST /v1/auth/otp/verify { phone, code, name? } -> { ok, accessToken, user }`
- `GET /v1/users/search?q= -> { ok, users }`
- `GET /v1/chats -> { ok, chats }`
- `POST /v1/chats/direct { peerUserId } -> { ok, chat }`
- `GET /v1/messages/:chatId -> { ok, messages }`
- `POST /v1/messages { chatId, clientMessageId, body?, attachments? } -> { ok, message }`
- `POST /v1/media/upload (multipart) -> { ok, attachment }`
- `WS /ws?token=...` events: `messageCreated`, `messageDelivered`, `messageRead`

## Curl flow
```bash
curl -X POST http://localhost:8080/v1/auth/otp/send -H 'content-type: application/json' -d '{"phone":"+10000000001"}'

curl -X POST http://localhost:8080/v1/auth/otp/verify -H 'content-type: application/json' -d '{"phone":"+10000000001","code":"123456","name":"Alice"}'

curl -X GET http://localhost:8080/v1/users/search?q=%2B10000000002 -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:8080/v1/chats/direct -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"peerUserId":"<USER2_ID>"}'

curl -X POST http://localhost:8080/v1/messages -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"chatId":"<CHAT_ID>","clientMessageId":"m-1","body":"Hello"}'
```

## Backend tests
```bash
cd backend
npm install
npm test
```
Покрыто: otp send/verify, users search, create direct chat, send message, list messages.
