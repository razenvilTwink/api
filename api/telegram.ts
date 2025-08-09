// Восстановлено: приём заявок с фронта и отправка в Telegram
export const config = { runtime: 'edge' };

type ContactFormData = { name: string; phone: string; email?: string; message?: string };
type CallbackRequest = { name: string; phone: string; bestTime?: string; requestType: 'callback' };
type QuickEstimateRequest = {
  name: string; phone: string; projectType?: string; area?: string; budget?: string; description?: string; projectTitle?: string; requestType: 'quick_estimate'
};
type AnyRequest = ContactFormData | CallbackRequest | QuickEstimateRequest;

const json = (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' }, status: init?.status ?? 200 });
const sanitize = (v?: string) => (v || '').replace(/[<>]/g, '').replace(/javascript:/gi, '').trim().slice(0, 1000);
const isValidPhone = (p: string) => p.replace(/\D/g, '').length === 11 && p.replace(/\D/g, '').startsWith('7');

const buildMessage = (b: AnyRequest) => {
  const head = `👤 Имя: ${sanitize(b.name)}\n📞 Телефон: ${sanitize(b.phone)}`;
  if ((b as CallbackRequest).requestType === 'callback') {
    const r = b as CallbackRequest; return ['📞 ЗАЯВКА НА ОБРАТНЫЙ ЗВОНОК', head, `⏰ Удобное время: ${sanitize(r.bestTime) || 'Любое время'}`, '', new Date().toLocaleString('ru-RU')].join('\n');
  }
  if ((b as QuickEstimateRequest).requestType === 'quick_estimate') {
    const r = b as QuickEstimateRequest; return ['🧮 ЗАЯВКА НА БЫСТРЫЙ РАСЧЁТ', head, `🏗️ Тип: ${sanitize(r.projectType) || '—'}`, `📐 Площадь: ${sanitize(r.area) || '—'}`, `💰 Бюджет: ${sanitize(r.budget) || '—'}`, `🏠 Проект: ${sanitize(r.projectTitle) || '—'}`, '', '💬 Пожелания:', sanitize(r.description) || '—', '', new Date().toLocaleString('ru-RU')].join('\n');
  }
  const r = b as ContactFormData; return ['🔔 НОВАЯ ЗАЯВКА С САЙТА', head, `✉️ Email: ${sanitize(r.email) || 'Не указан'}`, '', '💬 Сообщение:', sanitize(r.message) || '—', '', new Date().toLocaleString('ru-RU')].join('\n');
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ success: false, message: 'Метод не поддерживается' }, { status: 405 });
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN; const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return json({ success: false, message: 'Нет TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID' }, { status: 500 });
    const body = (await req.json()) as AnyRequest;
    if (!body?.name || !body?.phone) return json({ success: false, message: 'name и phone обязательны' }, { status: 400 });
    if (!isValidPhone(body.phone)) return json({ success: false, message: 'Неверный телефон' }, { status: 400 });
    const text = buildMessage(body);
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text }) });
    const ok = tg.ok && (await tg.clone().json().catch(() => ({} as any))).ok !== false;
    if (!ok) return json({ success: false, message: 'Не удалось отправить в Telegram' }, { status: 500 });
    return json({ success: true, message: 'Сообщение отправлено' });
  } catch (e) {
    return json({ success: false, message: e instanceof Error ? e.message : 'Неизвестная ошибка' }, { status: 500 });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './lib/cors.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCorsPreflight(req, res)) return;
  applyCors(req, res);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Метод не поддерживается' });
  }

  try {
    const data = req.body;
    const { name, phone, email, message, bestTime, projectType, area, budget, description, projectTitle, requestType } = data;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Не указаны обязательные поля (имя и телефон)' });
    }

    // Формируем текст сообщения
    let text = '';
    if (requestType === 'callback') {
      text = `📞 ЗАЯВКА НА ОБРАТНЫЙ ЗВОНОК\n\n👤 Имя: ${name}\n📞 Телефон: ${phone}\n⏰ Удобное время: ${bestTime || 'Любое время'}\n\n📅 Дата заявки: ${new Date().toLocaleString('ru-RU')}\n🚨 СРОЧНО! Перезвонить в течение 15 минут`;
    } else if (requestType === 'quick_estimate') {
      text = `🧮 ЗАЯВКА НА БЫСТРЫЙ РАСЧЕТ\n\n👤 Имя: ${name}\n📞 Телефон: ${phone}\n🏗️ Тип проекта: ${projectType || 'Не указан'}\n📐 Площадь: ${area || 'Не указана'} м²\n💰 Бюджет: ${budget || 'Не указан'}\n🏠 Проект: ${projectTitle || 'Не указан'}\n\n💬 Пожелания:\n${description || 'Не указаны'}\n\n📅 Дата заявки: ${new Date().toLocaleString('ru-RU')}\n⚡ Клиент ждет расчет в течение 15 минут!`;
    } else {
      text = `🔔 НОВАЯ ЗАЯВКА С САЙТА\n\n👤 Имя: ${name}\n📞 Телефон: ${phone}\n✉️ Email: ${email || 'Не указан'}\n💬 Сообщение: ${message || 'Не указано'}\n\n⏰ Дата: ${new Date().toLocaleString('ru-RU')}`;
    }

    // Проверяем наличие токенов
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('Missing Telegram tokens:', { TELEGRAM_BOT_TOKEN: !!TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID: !!TELEGRAM_CHAT_ID });
      return res.status(500).json({ success: false, message: 'Telegram не настроен' });
    }

    const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    });

    const tgData = await response.json();
    if (!tgData.ok) {
      console.log('Telegram API error:', tgData);
      return res.status(500).json({ success: false, message: tgData.description || 'Ошибка Telegram API' });
    }

    return res.status(200).json({ success: true, message: 'Сообщение успешно отправлено' });
  } catch (error: any) {
    console.log('API error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Ошибка сервера' });
  }
}
