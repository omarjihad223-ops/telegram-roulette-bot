import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { checkAllForcedChats } from '../services/forcedSub.service';
import { checkCooldown } from '../services/roulette.service';
import { getBotInstance } from '../bot/instance';
import { tryQualifyReferral, registerReferralIfNew } from '../services/referral.service';
import { getClaimTaskByToken, parseTaskTokenFromStartParam } from '../services/claimTask.service';
import { prizeImageUrl } from '../services/prize.service';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = req.dbUser!;
  const reqWithStart = req as Request & { isNewUser?: boolean; startParam?: string };

  // Referral capture for users who opened the bot straight into the Mini App (a "startapp"
  // deep link) rather than going through the bot's /start command first — same logic
  // bot/start.ts uses for the classic path, just triggered from here instead.
  if (reqWithStart.isNewUser) {
    const taskToken = parseTaskTokenFromStartParam(reqWithStart.startParam);
    if (taskToken) {
      const task = await getClaimTaskByToken(taskToken);
      if (task) {
        const outcome = await registerReferralIfNew({ newUser: user, task, isBrandNewUser: true });
        logger.info({ outcome, taskToken, newUserId: user.telegramId }, 'referral registration attempt (mini app boot)');
      }
    }
  }

  const { ready, nextSpinAt } = await checkCooldown(user);
  const lastSpin =
    user.lastSpinWon === null || user.lastSpinWon === undefined
      ? null
      : {
          won: user.lastSpinWon,
          prizeName: user.lastSpinPrizeName ?? null,
          prizeIcon: user.lastSpinPrizeIcon ?? null,
          prizeImageUrl: user.lastSpinPrizeKey ? prizeImageUrl(user.lastSpinPrizeKey, !!user.lastSpinPrizeHasImage) : null,
          prizeKey: user.lastSpinPrizeKey ?? null,
        };

  res.json({
    ok: true,
    user: {
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      photoUrl: user.photoUrl,
      captchaPassed: user.captchaPassed,
      forcedSubOk: user.forcedSubOk,
      totalSpins: user.totalSpins,
      spinPoints: user.spinPoints,
    },
    wheel: { ready, nextSpinAt, lastSpin },
    isAdmin: req.adminRole !== null,
    adminRole: req.adminRole,
  });
});

export const getForcedSubStatus = asyncHandler(async (req: Request, res: Response) => {
  const bot = getBotInstance();
  const { allOk, missing } = await checkAllForcedChats(bot, req.telegramId!);

  if (allOk) {
    req.dbUser!.forcedSubOk = true;
    await req.dbUser!.save();
    await tryQualifyReferral(req.dbUser!._id as mongoose.Types.ObjectId);
  }

  res.json({ ok: true, allOk, missing });
});
