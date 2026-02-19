# Onyx Web Messenger (NexChat v3 UI)

## Что сделано
- Web клиент переведён на реальный backend API + WebSocket.
- Сохранён визуальный стиль NexChat v3 (двухпанельный layout, auth card, topbar, bubbles, modal, lightbox, dark/light theme).
- Убраны демо-данные и auto-reply: данные только из backend.

## Запуск
```bash
cd infra
docker compose up -d --build
```

## URL
- Web: http://localhost:5173
- Backend: http://localhost:8080
- Health: http://localhost:8080/v1/health
- MinIO console: http://localhost:9001

## UI-проверка (end-to-end)
1. Открой http://localhost:5173
2. Введи телефон (например `+10000000001`) → **Получить код**
3. Введи код `123456` → **Войти**
4. Кнопка **+** в sidebar → поиск пользователя по телефону (`+10000000002`) → клик по результату
5. Откройся direct chat, отправь сообщение
6. Скрепка: загрузи картинку/файл, отправь как attachment
7. Сообщения приходят realtime через WS

## API/WS, используемые web-клиентом
- `POST /v1/auth/otp/send`
- `POST /v1/auth/otp/verify`
- `GET /v1/users/search?q=`
- `POST /v1/chats/direct`
- `GET /v1/chats`
- `GET /v1/messages/:chatId`
- `POST /v1/messages`
- `POST /v1/media/upload`
- `WS /ws?token=...` события `messageCreated`, `messageDelivered`, `messageRead`

## Offline outbox
Если отправка не удалась, сообщение остаётся в `localStorage` (`onyx_outbox`) и повторно отправляется автоматически.
