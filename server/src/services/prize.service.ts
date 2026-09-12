import { Prize, IPrize } from '../models/Prize';
import { writeAudit } from '../models/AuditLog';
import { AppError } from '../utils/AppError';
import { notifyAllAdmins } from './notification.service';
import { HydratedDocument } from 'mongoose';

/**
 * Collapses multiple Prize documents that share the same `key` down to one — keeping
 * whichever was updated most recently. `key` is supposed to be unique (enforced by a
 * schema index), but if that index ever failed to build on a database that already had a
 * duplicate (see scripts/fixDuplicatePrizes.ts for why that can happen silently), every
 * query in the app would otherwise see multiple documents for the same prize and could
 * inconsistently pick different ones in different places — e.g. the wheel's visual list
 * showing one duplicate's name/image while the actual spin draws from the other. This makes
 * every prize-reading code path safe regardless of whether that cleanup script has been run.
 */
function dedupeByKeyKeepingNewest<T extends { key: string; updatedAt: Date }>(prizes: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const p of prizes) {
    const existing = byKey.get(p.key);
    if (!existing || p.updatedAt > existing.updatedAt) byKey.set(p.key, p);
  }
  return Array.from(byKey.values());
}

/** Builds the served image URL for a prize that has a custom image, or null otherwise.
 * The actual bytes live in MongoDB (see Prize.imageData) and are streamed by the dedicated
 * /api/prizes/:key/image route — never written to local disk, which is not durable on
 * platforms like Render where the container's disk is wiped on every restart/redeploy. */
export function prizeImageUrl(key: string, hasImage: boolean): string | null {
  return hasImage ? `/api/prizes/${key}/image` : null;
}

export async function listPrizes(): Promise<HydratedDocument<IPrize>[]> {
  return Prize.find({}).sort({ displayOrder: 1, createdAt: 1 });
}

/**
 * Fetches every Prize document and collapses duplicates down to one canonical document per
 * key (see dedupeByKeyKeepingNewest). This MUST run before any eligibility filtering
 * (isActive, stock, weight, etc.) — filtering first and deduping the filtered results, as
 * earlier code here did, lets two different callers with different filters resolve the same
 * key to two DIFFERENT documents when duplicates exist (e.g. the newest duplicate has 0
 * stock and gets filtered out of the draw pool, while an older duplicate with stock remains
 * and gets drawn from — meanwhile the unfiltered wheel-display query still shows the newest
 * one's name/image). Deduping first means every caller filters the exact same canonical set,
 * so this class of divergence is structurally impossible now, not just less likely.
 */
async function getCanonicalPrizes(): Promise<HydratedDocument<IPrize>[]> {
  const all = await Prize.find({});
  return dedupeByKeyKeepingNewest(all);
}

/** Public-safe view for the client wheel: no stock/weight/delivery counts — just what a
 * user is allowed to see (icon/image/name for the prizes that can currently be won). */
export async function listPublicWheelPrizes() {
  const canonical = await getCanonicalPrizes();
  const prizes = canonical
    .filter((p) => p.isActive && p.key !== 'referral_bonus')
    .sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.getTime() - b.createdAt.getTime());
  return prizes.map((p) => ({ key: p.key, name: p.name, icon: p.icon, imageUrl: prizeImageUrl(p.key, p.hasImage) }));
}

export async function getPrizeByKey(key: string) {
  return Prize.findOne({ key });
}

export async function createPrize(data: {
  key: string;
  name: string;
  icon: string;
  baseWeight: number;
  stock: number;
  isUnlimited?: boolean;
  displayOrder?: number;
  requiresManualDelivery?: boolean;
  actorId: number;
  actorUsername?: string;
}) {
  const existing = await Prize.findOne({ key: data.key });
  if (existing) throw new AppError('Prize key already exists', 409, 'PRIZE_EXISTS');

  const prize = await Prize.create({
    key: data.key,
    name: data.name,
    icon: data.icon || '🎁',
    baseWeight: data.baseWeight,
    stock: data.isUnlimited ? -1 : data.stock,
    isUnlimited: !!data.isUnlimited,
    displayOrder: data.displayOrder ?? 0,
    requiresManualDelivery: data.requiresManualDelivery ?? true,
  });

  await writeAudit({
    actorId: data.actorId,
    actorUsername: data.actorUsername,
    action: 'prize.create',
    target: prize.key,
    metadata: { name: prize.name, baseWeight: prize.baseWeight, stock: prize.stock },
  });

  return prize;
}

export async function updatePrizeDetails(
  key: string,
  data: { name?: string; icon?: string; storePrice?: number | null },
  actorId: number,
  actorUsername?: string
) {
  const prize = await Prize.findOne({ key });
  if (!prize) throw new AppError('Prize not found', 404, 'NOT_FOUND');

  if (data.name !== undefined && data.name.trim()) prize.name = data.name.trim();
  if (data.icon !== undefined && data.icon.trim()) prize.icon = data.icon.trim();
  // storePrice: undefined = leave unchanged, null = remove from store, number = set price
  if (data.storePrice !== undefined) prize.storePrice = data.storePrice;
  await prize.save();

  await writeAudit({
    actorId,
    actorUsername,
    action: 'prize.update',
    target: key,
    metadata: { name: prize.name, icon: prize.icon, storePrice: prize.storePrice },
  });

  return prize;
}

/** Stores the uploaded image's bytes directly on the Prize document in MongoDB. */
export async function setPrizeImage(
  key: string,
  buffer: Buffer,
  mimeType: string,
  actorId: number,
  actorUsername?: string
) {
  const prize = await Prize.findOne({ key });
  if (!prize) throw new AppError('Prize not found', 404, 'NOT_FOUND');

  prize.imageData = buffer;
  prize.imageMimeType = mimeType;
  prize.hasImage = true;
  await prize.save();

  await writeAudit({ actorId, actorUsername, action: 'prize.image.set', target: key, metadata: { sizeBytes: buffer.length, mimeType } });
  return prize;
}

export async function clearPrizeImage(key: string, actorId: number, actorUsername?: string) {
  const prize = await Prize.findOne({ key });
  if (!prize) throw new AppError('Prize not found', 404, 'NOT_FOUND');

  prize.imageData = null;
  prize.imageMimeType = null;
  prize.hasImage = false;
  await prize.save();

  await writeAudit({ actorId, actorUsername, action: 'prize.image.clear', target: key });
  return prize;
}

/** Loads the actual image bytes for serving — the only place that ever selects imageData. */
export async function getPrizeImageData(key: string): Promise<{ data: Buffer; mimeType: string } | null> {
  const prize = await Prize.findOne({ key }).select('imageData imageMimeType hasImage');
  if (!prize || !prize.hasImage || !prize.imageData) return null;
  return { data: prize.imageData, mimeType: prize.imageMimeType || 'image/jpeg' };
}

export async function deletePrize(key: string, actorId: number, actorUsername?: string) {
  const prize = await Prize.findOneAndDelete({ key });
  if (!prize) throw new AppError('Prize not found', 404, 'NOT_FOUND');
  await writeAudit({
    actorId,
    actorUsername,
    action: 'prize.delete',
    target: key,
    metadata: { name: prize.name },
  });
  return prize;
}

export async function addStock(key: string, amount: number, actorId: number, actorUsername?: string) {
  if (amount <= 0) throw new AppError('Amount must be positive', 422, 'VALIDATION_ERROR');

  const prize = await Prize.findOne({ key });
  if (!prize) throw new AppError('Prize not found', 404, 'NOT_FOUND');
  if (prize.isUnlimited) throw new AppError('This prize has unlimited stock', 400, 'UNLIMITED_PRIZE');

  const oldStock = prize.stock;
  prize.stock += amount;
  const wasOutOfStock = oldStock <= 0;
  await prize.save();

  await writeAudit({
    actorId,
    actorUsername,
    action: 'prize.stock.add',
    target: key,
    metadata: { oldStock, addedAmount: amount, newStock: prize.stock },
  });

  if (wasOutOfStock && prize.stock > 0 && !prize.isActive) {
    // Optionally re-activate if it was auto-disabled — left as explicit admin action instead of automatic,
    // to avoid surprising re-activation. See setActive().
  }

  return prize;
}

export async function removeStock(key: string, amount: number, actorId: number, actorUsername?: string) {
  if (amount <= 0) throw new AppError('Amount must be positive', 422, 'VALIDATION_ERROR');

  const prize = await Prize.findOne({ key });
  if (!prize) throw new AppError('Prize not found', 404, 'NOT_FOUND');
  if (prize.isUnlimited) throw new AppError('This prize has unlimited stock', 400, 'UNLIMITED_PRIZE');

  const oldStock = prize.stock;
  prize.stock = Math.max(0, prize.stock - amount);
  await prize.save();

  await writeAudit({
    actorId,
    actorUsername,
    action: 'prize.stock.remove',
    target: key,
    metadata: { oldStock, removedAmount: amount, newStock: prize.stock },
  });

  if (oldStock > 0 && prize.stock === 0) {
    await notifyAllAdmins(
      'system_announcement',
      '⚠️ تنبيه مخزون',
      `الجائزة:\n${prize.name}\n\nنفد مخزونها بالكامل.`
    );
    await writeAudit({ actorId, actorUsername, action: 'prize.out_of_stock', target: key });
  }

  return prize;
}

export async function setStockExact(key: string, newStock: number, actorId: number, actorUsername?: string) {
  const prize = await Prize.findOne({ key });
  if (!prize) throw new AppError('Prize not found', 404, 'NOT_FOUND');
  if (prize.isUnlimited) throw new AppError('This prize has unlimited stock', 400, 'UNLIMITED_PRIZE');

  const oldStock = prize.stock;
  prize.stock = Math.max(0, newStock);
  await prize.save();

  await writeAudit({
    actorId,
    actorUsername,
    action: 'prize.stock.set',
    target: key,
    metadata: { oldStock, newStock: prize.stock },
  });

  if (oldStock > 0 && prize.stock === 0) {
    await notifyAllAdmins(
      'system_announcement',
      '⚠️ تنبيه مخزون',
      `الجائزة:\n${prize.name}\n\nنفد مخزونها بالكامل.`
    );
  }

  return prize;
}

export async function setActive(key: string, isActive: boolean, actorId: number, actorUsername?: string) {
  const prize = await Prize.findOneAndUpdate({ key }, { isActive }, { new: true });
  if (!prize) throw new AppError('Prize not found', 404, 'NOT_FOUND');
  await writeAudit({
    actorId,
    actorUsername,
    action: isActive ? 'prize.activate' : 'prize.deactivate',
    target: key,
  });
  return prize;
}

/**
 * Returns the list of prizes currently eligible to be drawn:
 * active AND (unlimited OR stock > 0).
 */
export async function getEligiblePrizes(): Promise<HydratedDocument<IPrize>[]> {
  const canonical = await getCanonicalPrizes();
  return canonical.filter((p) => p.isActive && p.baseWeight > 0 && (p.isUnlimited || p.stock > 0));
}

/**
 * Validates that configured weights sum to (approximately) 100.
 * Used by admin tooling / startup diagnostics — never exposed to end users.
 */
export async function validateWeightsSumTo100(tolerance = 0.001): Promise<{ ok: boolean; sum: number }> {
  const prizes = await Prize.find({});
  const sum = prizes.reduce((acc, p) => acc + p.baseWeight, 0);
  return { ok: Math.abs(sum - 100) <= tolerance, sum };
}
