/* ==========================================================================
   GET /api/case-studies      → published records, in site order
   GET /api/case-studies?slug=alliance-driveaway → one record

   Read-only. The detail pages are still generated as static HTML because
   search engines and Core Web Vitals both prefer it; this endpoint is what
   anything dynamic reads from, and what proves the collection is current.
   ========================================================================== */

import { COLLECTIONS, getDb } from '../lib/db.mjs';
import { corsHeaders, json, str } from '../lib/http.mjs';

const LIST_FIELDS = {
  _id: 0, slug: 1, name: 1, category: 1, tagline: 1, card: 1,
  images: 1, flagship: 1, order: 1
};

const DETAIL_FIELDS = { _id: 0, contentHash: 0, createdAt: 0, updatedAt: 0 };

export default async (req) => {
  if (req.method !== 'GET') return json(req, 405, { ok: false, error: 'method not allowed' });

  const slug = str(new URL(req.url).searchParams.get('slug'), 80).toLowerCase();
  if (slug && !/^[a-z0-9-]{2,80}$/.test(slug)) {
    return json(req, 400, { ok: false, error: 'invalid slug' });
  }

  try {
    const db = await getDb();
    const col = db.collection(COLLECTIONS.caseStudies);

    if (slug) {
      const doc = await col.findOne({ slug, published: true }, { projection: DETAIL_FIELDS });
      if (!doc) return json(req, 404, { ok: false, error: 'not found' });
      return cached(req, { ok: true, caseStudy: doc });
    }

    const docs = await col
      .find({ published: true }, { projection: LIST_FIELDS })
      .sort({ order: 1 })
      .limit(200)
      .toArray();

    return cached(req, { ok: true, count: docs.length, caseStudies: docs });
  } catch (err) {
    console.error('[case-studies] read failed:', err.message);
    return json(req, 503, { ok: false, error: 'unavailable' });
  }
};

/* Published copy changes on a deploy, not per request. */
function cached(req, payload) {
  const headers = corsHeaders(req);
  headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=3600';
  return new Response(JSON.stringify(payload), { status: 200, headers });
}

export const config = { path: '/api/case-studies' };
