// Восстановлено: приём вебхуков Telegram (опционально)
export const config = { runtime: 'edge' };

const json = (d: unknown, init?: ResponseInit) => new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json' }, status: init?.status ?? 200 });

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
  const secret = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) return json({ ok: false, error: 'unauthorized' }, { status: 401 });
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN; if (!token) return json({ ok: false, error: 'no_token' }, { status: 500 });
    const update = await req.json();
    const chatId = update?.message?.chat?.id as number | undefined;
    const text = update?.message?.text as string | undefined;
    if (chatId && text === '/start') {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: '✅ Бот на вебхуках активен. Введите пароль, чтобы подписаться.' }) });
    }
    // Доработайте: проверка ADMIN_PASSWORD и сохранение chat_id в БД/KV
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'unknown' }, { status: 500 });
  }
}


