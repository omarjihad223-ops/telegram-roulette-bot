import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import {
  listPrizes,
  createPrize,
  deletePrize,
  addStock,
  removeStock,
  setStockExact,
  setActive,
  updatePrizeDetails,
  validateWeightsSumTo100,
} from '../services/prize.service';
import { AppError } from '../utils/AppError';

export const adminListPrizes = asyncHandler(async (req: Request, res: Response) => {
  const prizes = await listPrizes();
  const weightCheck = await validateWeightsSumTo100();
  res.json({ ok: true, prizes, weightCheck });
});

export const adminCreatePrize = asyncHandler(async (req: Request, res: Response) => {
  const { key, name, icon, baseWeight, stock, isUnlimited, displayOrder, requiresManualDelivery } = req.body;
  if (!key || !name || typeof baseWeight !== 'number') {
    throw new AppError('key, name, baseWeight are required', 422, 'VALIDATION_ERROR');
  }
  const prize = await createPrize({
    key,
    name,
    icon,
    baseWeight,
    stock: stock ?? 0,
    isUnlimited,
    displayOrder,
    requiresManualDelivery,
    actorId: req.telegramId!,
    actorUsername: req.dbUser!.username,
  });
  res.json({ ok: true, prize });
});

export const adminUpdatePrize = asyncHandler(async (req: Request, res: Response) => {
  const { name, icon } = req.body as { name?: string; icon?: string };
  const prize = await updatePrizeDetails(req.params.key, { name, icon }, req.telegramId!, req.dbUser!.username);
  res.json({ ok: true, prize });
});

export const adminDeletePrize = asyncHandler(async (req: Request, res: Response) => {
  const prize = await deletePrize(req.params.key, req.telegramId!, req.dbUser!.username);
  res.json({ ok: true, prize });
});

export const adminAddStock = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body as { amount?: number };
  if (typeof amount !== 'number') throw new AppError('amount is required', 422, 'VALIDATION_ERROR');
  const prize = await addStock(req.params.key, amount, req.telegramId!, req.dbUser!.username);
  res.json({ ok: true, prize });
});

export const adminRemoveStock = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body as { amount?: number };
  if (typeof amount !== 'number') throw new AppError('amount is required', 422, 'VALIDATION_ERROR');
  const prize = await removeStock(req.params.key, amount, req.telegramId!, req.dbUser!.username);
  res.json({ ok: true, prize });
});

export const adminSetStock = asyncHandler(async (req: Request, res: Response) => {
  const { stock } = req.body as { stock?: number };
  if (typeof stock !== 'number') throw new AppError('stock is required', 422, 'VALIDATION_ERROR');
  const prize = await setStockExact(req.params.key, stock, req.telegramId!, req.dbUser!.username);
  res.json({ ok: true, prize });
});

export const adminSetPrizeActive = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.body as { isActive?: boolean };
  if (typeof isActive !== 'boolean') throw new AppError('isActive is required', 422, 'VALIDATION_ERROR');
  const prize = await setActive(req.params.key, isActive, req.telegramId!, req.dbUser!.username);
  res.json({ ok: true, prize });
});
