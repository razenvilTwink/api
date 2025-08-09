import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { applyCors, handleCorsPreflight } from './lib/cors.js';

const JWT_SECRET = process.env.JWT_SECRET || '';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCorsPreflight(req, res)) return;
  applyCors(req, res);
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  if (!match) return res.json({ success: false });
  try {
    if (!JWT_SECRET) return res.json({ success: false });
    const payload = jwt.verify(match[1], JWT_SECRET) as { username: string };
    return res.json({ success: true, username: payload.username });
  } catch {
    return res.json({ success: false });
  }
}