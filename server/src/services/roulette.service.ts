import mongoose, { HydratedDocument } from 'mongoose';
import { Prize, IPrize } from '../models/Prize';
import { User, IUser } from '../models/User';
import { UserPrize } from '../models/UserPrize';
import { RouletteSpin } from '../models/RouletteSpin';
import { getSettings } from '../models/Settings';
import { weightedPick } from '../utils/random';
import { AppError } from '../utils/AppError';
import { createNotification } from './notification.service';
import { createClaimTaskForPrize, buildTaskLink } from './claimTask.service';
import { logger } from '../config/logger';

const MAX_DRAW_RETRIES = 5;

export interface SpinResult {
  won: boolean;
  prizeName?: string;
  prizeKey?: string;
  userPrizeId?: string;
  expiresAt?: Date | null;
  nextSpinAt: Date;
}

export function getNextSpinAt(user: HydratedDocument<IUser>, cooldownHours: number): Date {
  if (!user.lastSpinAt) return new Date(0);
  return new Date(user.lastSpinAt.getTime() + cooldownHours * 60 * 60 * 1000);
}

export async function checkCooldown(user: HydratedDocument<IUser>): Promise<{ ready: boolean; nextSpinAt: Date }> {
  const settings = await getSettings();
  const nextSpinAt = getNextSpinAt(user, settings.spinCooldownHours);
  return { ready: Date.now() >= nextSpinAt.getTime(), nextSpinAt };
}

/**
 * Atomically reserves one unit of stock for a prize. Returns true if reserved successfully.
 * Unlimited-stock prizes always succeed. This is the anti-overselling guard against race
 * conditions when many users spin at the same instant.
 */
async function tryReserveStock(prizeId: mongoose.Types.ObjectId, isUnlimited: boolean): Promise<boolean> {
  if (isUnlimited) {
    await Prize.updateOne({ _id: prizeId }, { $inc: { pendingCount: 1 } });
    return true;
  }
  const res = await Prize.updateOne(
    { _id: prizeId, stock: { $gt: 0 } },
    { $inc: { stock: -1, pendingCount: 1 } }
  );
  return res.modifiedCount === 1;
}

async function releaseReservation(prizeId: mongoose.Types.ObjectId, isUnlimited: boolean): Promise<void> {
  // Used only if something fails after reservation but before the UserPrize is durably created.
  if (isUnlimited) {
    await Prize.updateOne({ _id: prizeId }, { $inc: { pendingCount: -1 } });
  } else {
    await Prize.updateOne({ _id: prizeId }, { $inc: { stock: 1, pendingCount: -1 } });
  }
}

/**
 * Performs a full roulette spin for a user. Fully server-authoritative:
 * - eligibility (cooldown) is re-checked here, not trusted from client
 * - the winning prize is chosen here using cryptographically-random weighted selection
 * - stock is decremented atomically with retry-on-conflict
 * - if every eligible prize's stock is claimed concurrently, the user gets an empty result
 *   ("better luck next time") rather than an error
 */
export async function performSpin(telegramId: number): Promise<SpinResult> {
  const user = await User.findOne({ telegramId });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  if (user.isBanned) throw new AppError('User is banned', 403, 'BANNED');

  const settings = await getSettings();
  if (settings.maintenanceMode) throw new AppError('Under maintenance', 503, 'MAINTENANCE');

  const { ready, nextSpinAt } = await checkCooldown(user);
  if (!ready) {
    throw new AppError('Spin not ready yet', 429, 'SPIN_COOLDOWN');
  }

  let attempt = 0;
  let reservedPrize: HydratedDocument<IPrize> | null = null;

  while (attempt < MAX_DRAW_RETRIES) {
    attempt += 1;

    const eligible = await Prize.find({
      isActive: true,
      baseWeight: { $gt: 0 },
      $or: [{ isUnlimited: true }, { stock: { $gt: 0 } }],
    });

    if (eligible.length === 0) {
      // No prize currently has stock — draw is skipped entirely, no spin is "wasted" on a lie.
      break;
    }

    const totalWeight = eligible.reduce((sum, p) => sum + p.baseWeight, 0);
    if (totalWeight <= 0) break;

    const picked = weightedPick(eligible.map((p) => ({ ref: p, weight: p.baseWeight })));
    const candidate = picked.ref;

    const reserved = await tryReserveStock(candidate._id as mongoose.Types.ObjectId, candidate.isUnlimited);
    if (reserved) {
      reservedPrize = candidate;
      break;
    }
    // Someone else took the last unit between our read and our write — retry with fresh data.
    logger.info({ prizeKey: candidate.key, attempt }, 'roulette stock race, retrying draw');
  }

  // Always consume the cooldown regardless of outcome — this IS the user's spin for this window.
  user.lastSpinAt = new Date();
  user.totalSpins += 1;
  await user.save();

  const weightsSnapshot: Record<string, number> = {};
  const allPrizesForSnapshot = await Prize.find({});
  for (const p of allPrizesForSnapshot) weightsSnapshot[p.key] = p.baseWeight;

  if (!reservedPrize) {
    await RouletteSpin.create({
      user: user._id,
      telegramId,
      prize: null,
      prizeNameSnapshot: '',
      weightsSnapshot,
      isEmptyResult: true,
    });
    const { nextSpinAt: newNext } = await checkCooldown(user);
    return { won: false, nextSpinAt: newNext };
  }

  try {
    const spin = await RouletteSpin.create({
      user: user._id,
      telegramId,
      prize: reservedPrize._id,
      prizeNameSnapshot: reservedPrize.name,
      weightsSnapshot,
      isEmptyResult: false,
    });

    const expiresAt = new Date(Date.now() + settings.prizeExpiryHours * 60 * 60 * 1000);

    const userPrize = await UserPrize.create({
      user: user._id,
      telegramId,
      prize: reservedPrize._id,
      prizeNameSnapshot: reservedPrize.name,
      source: 'wheel',
      wonAt: new Date(),
      expiresAt,
      status: 'active',
      spinId: spin._id,
    });

    const task = await createClaimTaskForPrize(userPrize);
    const taskLink = buildTaskLink(task.token);

    await createNotification({
      userId: user._id as mongoose.Types.ObjectId,
      telegramId,
      type: 'prize_won',
      title: '🎉 مبروك!',
      body:
        `ربحت: ${reservedPrize.name}\n` +
        `لديك 24 ساعة لاستلامها من الحقيبة.\n\n` +
        `⚠️ عشان تكدر تسحبها لازم تدعو ${task.requiredCount} أشخاص عن طريق رابطك الخاص بهذي الجائزة (تلقاه بالحقيبة).` +
        (taskLink ? `\n\n${taskLink}` : ''),
    });

    const { nextSpinAt: newNext } = await checkCooldown(user);

    return {
      won: true,
      prizeName: reservedPrize.name,
      prizeKey: reservedPrize.key,
      userPrizeId: (userPrize._id as mongoose.Types.ObjectId).toString(),
      expiresAt,
      nextSpinAt: newNext,
    };
  } catch (err) {
    // Roll back the stock reservation if we failed to durably record the win —
    // the user must never lose inventory for a prize they didn't actually receive.
    await releaseReservation(reservedPrize._id as mongoose.Types.ObjectId, reservedPrize.isUnlimited);
    logger.error({ err }, 'failed to finalize spin after stock reservation, rolled back');
    throw new AppError('Spin failed, please try again', 500, 'SPIN_FAILED');
  }
}
