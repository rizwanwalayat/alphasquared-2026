/* ==========================================================================
   POST /api/chat — one document per assistant conversation.

   The widget answers from a local knowledge base, so this endpoint is not in
   the reply path: it records what was asked. Questions the bot could not
   answer are what tells us which pages are missing an answer.
   ========================================================================== */

import { clientIp, getDb } from '../lib/db.mjs';
import {
  COLLECTIONS, json, originAllowed, readJson, requestMeta, str, throttled
} from '../lib/http.mjs';

const ROLES = new Set(['user', 'bot']);
const MAX_TURNS = 60;

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

  const sessionId = str(body.sessionId, 40);
  const turns = Array.isArray(body.turns) ? body.turns.slice(-MAX_TURNS) : [];
  if (!/^[a-z0-9-]{8,40}$/.test(sessionId) || !turns.length) {
    return json(req, 422, { ok: false, error: 'invalid session' });
  }

  const messages = turns
    .filter((t) => t && ROLES.has(t.role))
    .map((t) => ({
      role: t.role,
      text: str(t.text, 1000),
      answered: t.answered !== false,
      at: new Date()
    }))
    .filter((t) => t.text);

  if (!messages.length) return json(req, 422, { ok: false, error: 'invalid session' });

  const meta = requestMeta(req, clientIp(req));

  try {
    if (await throttled(COLLECTIONS.chats, meta.ipHash, { windowMs: 60 * 1000, max: 30 })) {
      return json(req, 429, { ok: false, error: 'slow down' });
    }

    const db = await getDb();
    const now = new Date();
    await db.collection(COLLECTIONS.chats).updateOne(
      { sessionId },
      {
        $setOnInsert: { sessionId, startedAt: now, createdAt: now, ...meta },
        $set: { lastMessageAt: now },
        $inc: { messageCount: messages.length },
        $push: { messages: { $each: messages, $slice: -200 } }
      },
      { upsert: true }
    );

    return json(req, 202, { ok: true });
  } catch (err) {
    console.error('[chat] write failed:', err.message);
    return json(req, 503, { ok: false, error: 'unavailable' });
  }
};

export const config = { path: '/api/chat' };
