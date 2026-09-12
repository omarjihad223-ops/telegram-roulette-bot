import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { performSpin, checkCooldown } from '../services/roulette.service';
import { listPublicWheelPrizes, getPrizeImageData, prizeImageUrl } from '../services/prize.service';
import { AppError } from '../utils/AppError';

export const getWheelStatus = asyncHandler(async (req: Request, res: Response) => {
  const { ready, nextSpinAt } = await checkCooldown(req.dbUser!);
  const user = req.dbUser!;
  // What the user's most recent spin actually resulted in — null until they've spun at
  // least once. The client shows this as text next to the wheel; it never has to guess
  // from wherever the reel's visual position happens to be sitting after a remount.
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
  res.json({ ok: true, ready, nextSpinAt, lastSpin });
});

/** Streams a prize's custom image straight from MongoDB — no local disk involved, so this
 * works correctly on hosts (like Render) that don't persist the container's local disk. */
export const getPrizeImage = asyncHandler(async (req: Request, res: Response) => {
  const image = await getPrizeImageData(req.params.key);
  if (!image) throw new AppError('Image not found', 404, 'NOT_FOUND');
  res.setHeader('Content-Type', image.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day — admin can always re-upload to bust this
  res.send(image.data);
});

/** The exact prize list the wheel is drawn from — same source of truth the spin itself
 * uses (Prize.key), so the wheel can never visually show a different set of prizes/keys
 * than what can actually be won. Includes each prize's current icon/imageUrl. */
export const getWheelPrizes = asyncHandler(async (_req: Request, res: Response) => {
  const prizes = await listPublicWheelPrizes();
  res.json({ ok: true, prizes });
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
