import { connectDatabase, disconnectDatabase } from '../config/database';
import { Prize } from '../models/Prize';
import { logger } from '../config/logger';

/**
 * WHY THIS EXISTS
 * ----------------
 * `Prize.key` is declared `unique: true` in the schema, but Mongoose only builds that index
 * when the app starts (and only if `autoIndex` is on) — it does NOT retroactively fix data
 * that already violated uniqueness before the index existed. If two Prize documents ever
 * ended up with the same `key` (e.g. from an earlier seed run, a manual DB edit, or a race
 * during an early upsert), the unique index silently fails to build and MongoDB keeps
 * BOTH documents forever, with no error raised anywhere.
 *
 * The practical symptom of this is exactly "the wheel visually lands on one prize but the
 * delivered prize is different": every prize-related query in this app filters by `key`,
 * gets back whichever duplicate MongoDB happens to return first, and that can differ
 * between two calls (the wheel's public listing vs. the spin's own draw) if the duplicates
 * have diverged (different name/icon/image/stock after later edits).
 *
 * WHAT THIS SCRIPT DOES
 * ----------------------
 * 1. Groups all Prize documents by `key` and reports any key with more than one document.
 * 2. For each duplicate group, keeps the document that was updated most recently (the one
 *    most likely to reflect your latest admin-panel edits), merges the other document(s)'
 *    stock/deliveredCount/pendingCount into it (so no inventory count is silently lost),
 *    and deletes the rest.
 * 3. Ensures the unique index actually exists afterward, so this can't silently recur.
 *
 * This is READ-ONLY (report only) unless you pass --fix, e.g.:
 *   npm run fix-duplicate-prizes           (just reports — safe to run anytime)
 *   npm run fix-duplicate-prizes -- --fix  (actually merges/deletes duplicates)
 */
async function main() {
  const shouldFix = process.argv.includes('--fix');
  await connectDatabase();

  const duplicates = await Prize.aggregate<{ _id: string; count: number; ids: string[] }>([
    { $group: { _id: '$key', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicates.length === 0) {
    logger.info('✅ No duplicate prize keys found — this was not the cause.');
    await disconnectDatabase();
    process.exit(0);
  }

  logger.warn({ duplicateKeyCount: duplicates.length }, `⚠️  Found ${duplicates.length} prize key(s) with duplicate documents:`);

  for (const dup of duplicates) {
    const docs = await Prize.find({ key: dup._id }).sort({ updatedAt: -1 });
    logger.warn(
      { key: dup._id, docs: docs.map((d) => ({ id: d._id, name: d.name, stock: d.stock, isActive: d.isActive, updatedAt: d.updatedAt })) },
      `Duplicates for key "${dup._id}":`
    );

    if (!shouldFix) continue;

    const [keep, ...rest] = docs; // most recently updated first, per the sort above
    const mergedStock = keep.isUnlimited ? keep.stock : docs.reduce((sum, d) => sum + (d.isUnlimited ? 0 : d.stock), 0);
    const mergedDelivered = docs.reduce((sum, d) => sum + d.deliveredCount, 0);
    const mergedPending = docs.reduce((sum, d) => sum + d.pendingCount, 0);

    keep.stock = mergedStock;
    keep.deliveredCount = mergedDelivered;
    keep.pendingCount = mergedPending;
    await keep.save();

    for (const d of rest) {
      await Prize.deleteOne({ _id: d._id });
    }

    logger.info({ key: dup._id, keptId: keep._id, deletedCount: rest.length, mergedStock }, '✅ merged and cleaned duplicate');
  }

  if (shouldFix) {
    // Now that duplicates are gone, this can actually succeed.
    await Prize.collection.createIndex({ key: 1 }, { unique: true });
    logger.info('✅ Unique index on Prize.key confirmed — this class of bug cannot recur.');
  } else {
    logger.warn('This was a report-only run. Re-run with --fix to actually merge/delete the duplicates above.');
  }

  await disconnectDatabase();
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fix-duplicate-prizes failed:', err);
  process.exit(1);
});
