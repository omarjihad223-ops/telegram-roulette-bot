import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { performSpin, checkCooldown } from '../services/roulette.service';
import { AppError } from '../utils/AppError';

export const getWheelStatus = asyncHandler(async (req: Request, res: Response) => {
  const { ready, nextSpinAt } = await checkCooldown(req.dbUser!);
  res.json({ ok: true, ready, nextSpinAt });
});

export const spin = asyncHandler(async (req: Request, res: Response) => {
  const user = req.dbUser!;

  if (!user.forcedSubOk) {
    throw new AppError('Forced subscription required', 403, 'FORCED_SUB_REQUIRED');
  }
  if (!user.captchaPassed) {
    throw new AppError('Captcha required', 403, 'CAPTCHA_REQUIRED');
  }

  const result = await performSpin(req.telegramId!);
  res.json({ ok: true, result });
});
