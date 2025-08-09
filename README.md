# Backend (Vercel)

Функции:
- `api/telegram.ts` — приём форм с фронта → отправка в Telegram (`sendMessage`)
- `api/telegram-webhook.ts` — приём вебхуков Telegram (опционально, для пароля/подписок)

Деплой как отдельный проект Vercel (корень = `backend/`):
- Framework: Other; Build/Output: пусто (Vercel сам подхватит `api/*.ts`).
- Env:
  - Обязательно: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
  - Опционально (webhooks): `TELEGRAM_WEBHOOK_SECRET`

Фронтенд должен использовать:
```
VITE_API_BASE_URL=https://ВАШ-БЭКЕНД.vercel.app
```

Webhooks включить командой:
```bash
curl -X POST "https://api.telegram.org/bot<ТОКЕН>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{ \"url\": \"https://ВАШ-БЭКЕНД.vercel.app/api/telegram-webhook\", \"secret_token\": \"СЕКРЕТ\", \"drop_pending_updates\": true }"
```

Примечание: для хранения `chat_id` подписчиков используйте БД/KV (Supabase/Upstash). В serverless нельзя хранить состояние в файлах/памяти.
