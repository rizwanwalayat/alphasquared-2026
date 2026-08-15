/* ==========================================================================
   One-off index setup. Run once per environment after the env vars are set:

       npm run db:indexes

   Index creation is idempotent, so re-running it after a schema change is
   safe and is the intended way to apply new indexes.
   ========================================================================== */

import { COLLECTIONS, getDb } from './db.mjs';

const db = await getDb();

await db.collection(COLLECTIONS.leads).createIndexes([
  { key: { createdAt: -1 }, name: 'createdAt_desc' },
  { key: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
  { key: { email: 1, createdAt: -1 }, name: 'email_createdAt' },
  { key: { source: 1, createdAt: -1 }, name: 'source_createdAt' },
  // Powers the per-address throttle.
  { key: { ipHash: 1, createdAt: -1 }, name: 'ipHash_createdAt' }
]);

await db.collection(COLLECTIONS.chats).createIndexes([
  { key: { sessionId: 1 }, name: 'sessionId_unique', unique: true },
  { key: { lastMessageAt: -1 }, name: 'lastMessageAt_desc' },
  { key: { ipHash: 1, createdAt: -1 }, name: 'ipHash_createdAt' },
  // Transcripts are diagnostic, not records: drop them after 180 days.
  { key: { lastMessageAt: 1 }, name: 'ttl_180d', expireAfterSeconds: 60 * 60 * 24 * 180 }
]);

console.log('Indexes are in place.');
process.exit(0);
