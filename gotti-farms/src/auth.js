import crypto from 'node:crypto';
import { config } from './config.js';
import { HttpError } from './errors.js';

const COOKIE = 'gf_admin';
const MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

function secret() {
  if (!config.sessionSecret) throw new HttpError(503, 'Admin login is not set up. Add SESSION_SECRET in Netlify environment variables.');
  return config.sessionSecret;
}
const sign = (payload) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

export function checkPassword(input) {
  if (!config.adminPassword) return false;
  const a = crypto.createHash('sha256').update(String(input ?? '')).digest();
  const b = crypto.createHash('sha256').update(config.adminPassword).digest();
  return crypto.timingSafeEqual(a, b);
}

export function sessionCookie() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE_SECONDS * 1000 })).toString('base64url');
  const secure = config.isProd ? '; Secure' : '';
  return `${COOKIE}=${payload}.${sign(payload)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SECONDS}${secure}`;
}

export const clearCookie = () => `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;

export function isAdmin(cookieHeader) {
  if (!config.sessionSecret) return false;
  const raw = (cookieHeader || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}

// Best-effort rate limiting. Each function instance keeps its own counts,
// so this slows down abuse rather than blocking it completely.
const hits = new Map();
export function rateLimited(key, limit, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > limit;
}
