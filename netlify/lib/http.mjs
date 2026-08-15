/* ==========================================================================
   Shared request helpers: origin checks, JSON parsing with a hard size cap,
   field validation and the throttle. Everything a public endpoint has to do
   before it is allowed to touch the database.
   ========================================================================== */

import { COLLECTIONS, getDb, hashIp } from './db.mjs';

const MAX_BODY_BYTES = 16 * 1024;

export function corsHeaders(req) {
  const allowed = process.env.SITE_ORIGIN;
  const origin = req.headers.get('origin');
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
  // Same-origin posts send no Origin header at all; only echo one we allow.
  if (allowed && origin === allowed) {
    headers['Access-Control-Allow-Origin'] = allowed;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

export function json(req, status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(req) });
}

/* A cross-site form post arrives with an Origin the browser sets and cannot
   be forged, so rejecting foreign origins is the CSRF guard here. */
export function originAllowed(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const allowed = process.env.SITE_ORIGIN;
  if (!allowed) return true;
  return origin === allowed;
}

export async function readJson(req) {
  const type = req.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('unsupported media type');

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new Error('payload too large');

  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('bad shape');
    return body;
  } catch {
    throw new Error('invalid json');
  }
}

/* Control characters are stripped rather than escaped: nothing downstream has
   a use for them and they are the usual vehicle for log and header injection. */
export function str(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
}

const EMAIL = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;

export function email(value) {
  const v = str(value, 200).toLowerCase();
  return EMAIL.test(v) ? v : '';
}

export function stringList(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((v) => str(v, maxLen)).filter(Boolean);
}

/* Per-address throttle. Counting documents already in the collection keeps the
   limit honest across cold starts, which an in-memory counter would not. */
export async function throttled(collection, ipHash, { windowMs, max }) {
  if (!ipHash) return false;
  const db = await getDb();
  const since = new Date(Date.now() - windowMs);
  const recent = await db.collection(collection).countDocuments(
    { ipHash, createdAt: { $gte: since } },
    { limit: max + 1 }
  );
  return recent >= max;
}

export function requestMeta(req, ip) {
  return {
    page: str(req.headers.get('referer'), 300),
    userAgent: str(req.headers.get('user-agent'), 300),
    ipHash: hashIp(ip)
  };
}

export { COLLECTIONS };
