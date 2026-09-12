import mongoose, { HydratedDocument } from 'mongoose';
import { User, IUser } from '../models/User';
import { Referral } from '../models/Referral';
import { UserPrize } from '../models/UserPrize';
import { IClaimTask } from '../models/ClaimTask';
import { createNotification, notifyAdminsNewReferral } from './notification.service';
import { creditReferralToTask } from './claimTask.service';
import { logger } from '../config/logger';

/**
 * Registers a referral relationship when a brand-new user starts the bot via a prize's
 * own claim-task link (task_<token>). This ONLY records who invited whom — it never blocks
 * or gates anything for the invitee. The referral is permanently tied to that one task
 * (creditedTaskId), which is what stops the same invited friend from ever being reused to
 * unlock a second prize. The actual credit toward the task happens later, once qualification
 * conditions (forced-sub + captcha) are independently verified, via tryQualifyReferral().
 *
 * Rules enforced here:
 *  - a user can only ever be referred once, ever (unique index on invitee) — so they can
 *    only ever be credited toward the one task they first came in through
 *  - self-referral is rejected
 *  - referring an already-existing (pre-existing) user does NOT create a referral record
 *  - a task that's no longer pending (already completed/expired) can't accept new invitees
 */
export async function registerReferralIfNew(params: {
  newUser: HydratedDocument<IUser>;
  task: HydratedDocument<IClaimTask>;
  isBrandNewUser: boolean;
}): Promise<
  'registered' | 'self_referral' | 'not_new' | 'already_referred' | 'referrer_not_found' | 'task_not_active'
> {
  const { newUser, task, isBrandNewUser } = params;

  if (!isBrandNewUser) return 'not_new';
  if (task.referrerTelegramId === newUser.telegramId) return 'self_referral';
  if (task.status !== 'pending' || task.expiresAt.getTime() < Date.now()) return 'task_not_active';

  const referrer = await User.findOne({ telegramId: task.referrerTelegramId });
  if (!referrer) return 'referrer_not_found';

  const existing = await Referral.findOne({ invitee: newUser._id });
  if (existing) return 'already_referred';

  await Referral.create({
    referrer: referrer._id,
    referrerTelegramId: referrer.telegramId,
    invitee: newUser._id,
    inviteeTelegramId: newUser.telegramId,
    status: 'pending',
    creditedTaskId: task._id,
  });

  newUser.referredBy = referrer._id as mongoose.Types.ObjectId;
  await newUser.save();

  await createNotification({
    userId: referrer._id as mongoose.Types.ObjectId,
    telegramId: referrer.telegramId,
    type: 'referral_progress',
    title: '👋 دعوة جديدة',
    body: `دخل ${newUser.username ? '@' + newUser.username : newUser.firstName || 'مستخدم'} إلى رابطك. راح تُحتسب بعد إكمال الاشتراك الإجباري والتحقق.`,
  });

  const wonPrize = await UserPrize.findById(task.userPrize).select('prizeNameSnapshot');
  notifyAdminsNewReferral({
    invitee: { telegramId: newUser.telegramId, username: newUser.username, firstName: newUser.firstName },
    referrer: { telegramId: referrer.telegramId, username: referrer.username, firstName: referrer.firstName },
    prizeName: wonPrize?.prizeNameSnapshot ?? 'غير معروف',
  }).catch((err) => logger.warn({ err }, 'failed to notify admins of new referral'));

  return 'registered';
}

/**
 * Called whenever an invitee's forced-sub or captcha status changes. Once BOTH are satisfied
 * for the first time, the referral flips to "qualified" and — if it was made through a prize's
 * claim task — that task's progress is credited by one. This never grants a standalone bonus
 * prize anymore; a qualified referral's only effect is moving its task closer to complete.
 */
export async function tryQualifyReferral(inviteeUserId: mongoose.Types.ObjectId): Promise<void> {
  const referral = await Referral.findOne({ invitee: inviteeUserId, status: 'pending' });
  if (!referral) return;

  const invitee = await User.findById(inviteeUserId);
  if (!invitee) return;

  if (!invitee.forcedSubOk || !invitee.captchaPassed) return;

  referral.status = 'qualified';
  referral.qualifiedAt = new Date();
  referral.forcedSubOkAt = referral.forcedSubOkAt ?? new Date();
  referral.captchaOkAt = referral.captchaOkAt ?? new Date();
  await referral.save();

  await createNotification({
    userId: referral.referrer,
    telegramId: referral.referrerTelegramId,
    type: 'referral_progress',
    title: '✅ إحالة مؤهلة',
    body: `أصبحت إحالتك من ${invitee.username ? '@' + invitee.username : invitee.firstName || 'المستخدم'} مؤهلة!`,
  });

  if (referral.creditedTaskId) {
    await creditReferralToTask(referral.creditedTaskId as mongoose.Types.ObjectId);
  } else {
    logger.warn({ referralId: referral._id }, 'qualified referral with no claim task attached');
  }
}

export async function getReferralStats(telegramId: number) {
  const user = await User.findOne({ telegramId });
  if (!user) return null;

  const [pending, qualified] = await Promise.all([
    Referral.countDocuments({ referrer: user._id, status: 'pending' }),
    Referral.countDocuments({ referrer: user._id, status: 'qualified' }),
  ]);

  const list = await Referral.find({ referrer: user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('invitee', 'username firstName telegramId photoUrl');

  return { pending, qualified, total: pending + qualified, referrals: list };
}
