import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { checkAllForcedChats } from '../services/forcedSub.service';
import { checkCooldown } from '../services/roulette.service';
import { getBotInstance } from '../bot/instance';
import { tryQualifyReferral } from '../services/referral.service';
import mongoose from 'mongoose';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = req.dbUser!;
  const { ready, nextSpinAt } = await checkCooldown(user);

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
    },
    wheel: { ready, nextSpinAt },
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
