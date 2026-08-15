/* ==========================================================================
   POST /api/lead — the contact form and the homepage ops-triage form.

   Both write into one `leads` collection with a `source` discriminator, so the
   inbox is a single sorted view rather than two half-populated tables.
   ========================================================================== */

import { clientIp, getDb } from '../lib/db.mjs';
import {
  COLLECTIONS, email, json, originAllowed, readJson,
  requestMeta, str, stringList, throttled
} from '../lib/http.mjs';

const SOURCES = new Set(['contact', 'ops-triage']);

export default async (req) => {
  if (req.method === 'OPTIONS') return json(req, 204, {});
  if (req.method !== 'POST') return json(req, 405, { ok: false, error: 'method not allowed' });
  if (!originAllowed(req)) return json(req, 403, { ok: false, error: 'forbidden' });

  let body;
  try {
    body = await readJson(req);
  } catch {
    return json(req, 400, { ok: false, error: 'invalid request' });
  }

  // Honeypot. Answer 200 so a bot cannot tell a rejection from a success.
  if (str(body['bot-field'], 200)) return json(req, 200, { ok: true });

  const source = SOURCES.has(body.source) ? body.source : 'contact';
  const lead = {
    source,
    name: str(body.name, 120),
    email: email(body.email),
    company: str(body.company, 160),
    phone: str(body.phone, 40),
    message: str(body.message, 5000),
    interests: stringList(body.interest, 12, 80)
  };

  if (!lead.name || !lead.email || lead.message.length < 10) {
    return json(req, 422, { ok: false, error: 'Name, a valid email and a few sentences are required.' });
  }

  const ip = clientIp(req);
  const meta = requestMeta(req, ip);

  try {
    if (await throttled(COLLECTIONS.leads, meta.ipHash, { windowMs: 10 * 60 * 1000, max: 5 })) {
      return json(req, 429, { ok: false, error: 'Too many submissions. Try again shortly.' });
    }

    const db = await getDb();
    const now = new Date();
    const result = await db.collection(COLLECTIONS.leads).insertOne({
      ...lead,
      ...meta,
      status: 'new',
      createdAt: now,
      updatedAt: now
    });

    return json(req, 201, { ok: true, id: result.insertedId.toString() });
  } catch (err) {
    console.error('[lead] write failed:', err.message);
    return json(req, 503, { ok: false, error: 'Could not save that right now.' });
  }
};

export const config = { path: '/api/lead' };
