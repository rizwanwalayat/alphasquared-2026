/* ==========================================================================
   Mongo connection for Netlify Functions.

   Lambda reuses a warm container between invocations, so the client is cached
   on the module scope: a fresh connection per request would exhaust the Atlas
   connection pool under any real traffic.
   ========================================================================== */

import { MongoClient } from 'mongodb';
import { createHash } from 'node:crypto';

let clientPromise = null;

export function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true
    });
    clientPromise = client.connect();
  }

  return clientPromise.then((client) => client.db(process.env.MONGODB_DB || 'alphasquared'));
}

export const COLLECTIONS = {
  leads: 'leads',
  chats: 'chat_sessions',
  caseStudies: 'case_studies'
};

/* Addresses are never stored raw. The salted hash is enough to rate limit and
   spot duplicates, and useless to anyone who gets hold of the collection. */
export function hashIp(ip) {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || '';
  return createHash('sha256').update(salt + '|' + ip).digest('hex').slice(0, 32);
}

export function clientIp(req) {
  const fwd = req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0].trim() || null;
}
