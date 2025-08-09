import type { VercelRequest, VercelResponse } from '@vercel/node';

function computeAllowedOrigins(): string[] {
  const fromEnv = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const withWwwVariants = new Set<string>();
  for (const origin of fromEnv) {
    withWwwVariants.add(origin);
    try {
      const url = new URL(origin);
      if (!url.host.startsWith('www.')) {
        withWwwVariants.add(`${url.protocol}//www.${url.host}${url.pathname}`.replace(/\/$/, ''));
      }
    } catch {
      // ignore invalid URLs in env
    }
  }

  // Локальные адреса всегда разрешаем в dev
  const local = ['http://localhost:3000', 'http://localhost:5173'];
  return [...withWwwVariants, ...local];
}

const ALLOWED_ORIGINS = computeAllowedOrigins();

export function applyCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // По умолчанию для dev
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export function handleCorsPreflight(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.status(204).end();
    return true;
  }
  return false;
}

