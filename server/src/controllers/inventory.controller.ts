import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { UserPrize } from '../models/UserPrize';
import { ClaimTask } from '../models/ClaimTask';
import { requestClaim } from '../services/withdrawal.service';
import { buildTaskLink } from '../services/claimTask.service';
import { AppError } from '../utils/AppError';

export const listMyInventory = asyncHandler(async (req: Request, res: Response) => {
  const items = await UserPrize.find({ telegramId: req.telegramId })
    .sort({ createdAt: -1 })
    .limit(200);

  const wheelItemIds = items.filter((i) => i.source === 'wheel').map((i) => i._id);
  const tasks = await ClaimTask.find({ userPrize: { $in: wheelItemIds } });
  const taskByUserPrize = new Map(tasks.map((t) => [String(t.userPrize), t]));

  res.json({
    ok: true,
    items: items.map((i) => {
      const task = i.source === 'wheel' ? taskByUserPrize.get(String(i._id)) : undefined;
      return {
        id: i._id,
        prizeName: i.prizeNameSnapshot,
        source: i.source,
        wonAt: i.wonAt,
        expiresAt: i.expiresAt,
        status: i.status,
        task: task
          ? {
              link: buildTaskLink(task.token),
              requiredCount: task.requiredCount,
              creditedCount: task.creditedCount,
              status: task.status,
            }
          : null,
      };
    }),
  });
});

export const claimPrize = asyncHandler(async (req: Request, res: Response) => {
  const { userPrizeId } = req.body as { userPrizeId?: string };
  if (!userPrizeId) throw new AppError('userPrizeId is required', 422, 'VALIDATION_ERROR');

  const withdrawal = await requestClaim(req.telegramId!, userPrizeId);
  res.json({ ok: true, withdrawal });
});
