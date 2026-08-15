/* ==========================================================================
   Seed the case_studies collection from data/case-studies.json.

       python exportcases.py && npm run db:seed

   Records are upserted on slug and stamped with a content hash, so re-running
   after a copy edit touches only what changed. Slugs no longer in the export
   are unpublished rather than deleted: their URLs are live and indexed.
   ========================================================================== */

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { COLLECTIONS, getDb } from './db.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, '..', '..', 'data', 'case-studies.json');

const records = JSON.parse(await readFile(source, 'utf8'));
if (!Array.isArray(records) || !records.length) {
  throw new Error('case-studies.json is empty; run "python exportcases.py" first');
}

const db = await getDb();
const col = db.collection(COLLECTIONS.caseStudies);

await col.createIndexes([
  { key: { slug: 1 }, name: 'slug_unique', unique: true },
  { key: { published: 1, order: 1 }, name: 'published_order' },
  { key: { category: 1, order: 1 }, name: 'category_order' }
]);

const now = new Date();
const ops = records.map((doc) => {
  const hash = createHash('sha1').update(JSON.stringify(doc)).digest('hex');
  return {
    updateOne: {
      filter: { slug: doc.slug },
      update: {
        $setOnInsert: { slug: doc.slug, createdAt: now },
        $set: { ...doc, contentHash: hash, updatedAt: now }
      },
      upsert: true
    }
  };
});

const result = await col.bulkWrite(ops, { ordered: false });

const slugs = records.map((d) => d.slug);
const retired = await col.updateMany(
  { slug: { $nin: slugs }, published: true },
  { $set: { published: false, updatedAt: now } }
);

console.log(
  'case studies: %d inserted, %d updated, %d unpublished',
  result.upsertedCount,
  result.modifiedCount,
  retired.modifiedCount
);
process.exit(0);
