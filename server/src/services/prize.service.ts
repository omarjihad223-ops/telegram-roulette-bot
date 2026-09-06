import { Prize, IPrize } from '../models/Prize';
import { writeAudit } from '../models/AuditLog';
import { AppError } from '../utils/AppError';
import { notifyAllAdmins } from './notification.service';
import { HydratedDocument } from 'mongoose';

export async function listPrizes(): Promise<HydratedDocument<IPrize>[]> {
  return Prize.find({}).sort({ displayOrder: 1, createdAt: 1 });
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
  data: { name?: string; icon?: string },
  actorId: number,
  actorUsername?: string
) {
  const prize = await Prize.findOne({ key });
  if (!prize) throw new AppError('Prize not found', 404, 'NOT_FOUND');

  if (data.name !== undefined && data.name.trim()) prize.name = data.name.trim();
  if (data.icon !== undefined && data.icon.trim()) prize.icon = data.icon.trim();
  await prize.save();

  await writeAudit({
    actorId,
    actorUsername,
    action: 'prize.update',
    target: key,
    metadata: { name: prize.name, icon: prize.icon },
  });

  return prize;
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
  return Prize.find({
    isActive: true,
    baseWeight: { $gt: 0 },
    $or: [{ isUnlimited: true }, { stock: { $gt: 0 } }],
  });
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
