import mongoose, { HydratedDocument } from 'mongoose';
import { nanoid } from 'nanoid';
import { ClaimTask, IClaimTask } from '../models/ClaimTask';
import { IUserPrize } from '../models/UserPrize';
import { getSettings } from '../models/Settings';
import { env } from '../config/env';
import { createNotification } from './notification.service';
import { logger } from '../config/logger';

/**
 * Called right after a wheel prize is granted. Creates the prize's own, unique
 * invite-link requirement: the referrer must bring in `requiredCount` qualified
 * friends through THIS link before they can withdraw THIS specific prize.
 */
export async function createClaimTaskForPrize(
  userPrize: HydratedDocument<IUserPrize>
): Promise<HydratedDocument<IClaimTask>> {
  const settings = await getSettings();
  const token = nanoid(10);

  const task = await ClaimTask.create({
    userPrize: userPrize._id,
    user: userPrize.user,
    referrerTelegramId: userPrize.telegramId,
    token,
    requiredCount: settings.claimReferralsRequired,
    creditedCount: 0,
    status: 'pending',
    expiresAt: userPrize.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return task;
}

export function buildTaskLink(token: string): string | null {
  if (!env.BOT_USERNAME) return null;
  return `https://t.me/${env.BOT_USERNAME}?start=task_${token}`;
}

export async function getClaimTaskByToken(token: string) {
  return ClaimTask.findOne({ token });
}

export async function getClaimTaskForUserPrize(userPrizeId: mongoose.Types.ObjectId | string) {
  return ClaimTask.findOne({ userPrize: userPrizeId });
}

/**
 * Called whenever a referral tied to a task becomes qualified (forced-sub + captcha both
 * passed). Bumps that task's credited count and — once it hits the requirement — marks it
 * completed and lets the winner know their prize is now withdrawable.
 */
export async function creditReferralToTask(taskId: mongoose.Types.ObjectId) {
  const task = await ClaimTask.findById(taskId);
  if (!task) return;
  if (task.status !== 'pending') return; // already completed or expired — never re-credit

  task.creditedCount += 1;

  if (task.creditedCount >= task.requiredCount) {
    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();

    await createNotification({
      userId: task.user,
      telegramId: task.referrerTelegramId,
      type: 'referral_progress',
      title: '🎉 اكتملت مهمة الدعوات',
      body: 'أكملت عدد الدعوات المطلوب لهذه الجائزة. تقدر الحين تروح للحقيبة وتضغط "استلام".',
    });
  } else {
    await task.save();
    const remaining = task.requiredCount - task.creditedCount;
    await createNotification({
      userId: task.user,
      telegramId: task.referrerTelegramId,
      type: 'referral_progress',
      title: '👍 إحالة مؤهلة لهذه الجائزة',
      body: `باقي عليك ${remaining} إحالة مؤهلة عشان تكدر تسحب هذي الجائزة.`,
    });
  }

  logger.info({ taskId: task._id, credited: task.creditedCount, required: task.requiredCount }, 'claim task credited');
}

/** Marks a task expired (called from the expiration worker alongside its UserPrize). */
export async function expireClaimTaskForUserPrize(userPrizeId: mongoose.Types.ObjectId | string) {
  await ClaimTask.updateOne({ userPrize: userPrizeId, status: 'pending' }, { status: 'expired' });
}
