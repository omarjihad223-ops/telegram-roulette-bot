import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getDashboardStats } from '../services/stats.service';
import { AuditLog } from '../models/AuditLog';
import { getSettings } from '../models/Settings';
import { writeAudit } from '../models/AuditLog';
import { AppError } from '../utils/AppError';
import { runBroadcast, BroadcastTarget, BroadcastButton } from '../services/broadcast.service';
import { getBotInstance } from '../bot/instance';

export const adminGetStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await getDashboardStats();
  res.json({ ok: true, stats });
});

export const adminListAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 50);
  const [logs, total] = await Promise.all([
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    AuditLog.countDocuments({}),
  ]);
  res.json({ ok: true, logs, total, page, pageSize });
});

export const adminGetSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getSettings();
  res.json({ ok: true, settings });
});

export const adminUpdateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getSettings();
  const { spinCooldownHours, prizeExpiryHours, expiryReminderIntervalHours, referralBonusEnabled, referralBonusPrizeKey } =
    req.body as Partial<{
      spinCooldownHours: number;
      prizeExpiryHours: number;
      expiryReminderIntervalHours: number;
      referralBonusEnabled: boolean;
      referralBonusPrizeKey: string | null;
    }>;

  if (typeof spinCooldownHours === 'number') settings.spinCooldownHours = spinCooldownHours;
  if (typeof prizeExpiryHours === 'number') settings.prizeExpiryHours = prizeExpiryHours;
  if (typeof expiryReminderIntervalHours === 'number') settings.expiryReminderIntervalHours = expiryReminderIntervalHours;
  if (typeof referralBonusEnabled === 'boolean') settings.referralBonusEnabled = referralBonusEnabled;
  if (referralBonusPrizeKey !== undefined) settings.referralBonusPrizeKey = referralBonusPrizeKey;

  await settings.save();
  await writeAudit({ actorId: req.telegramId!, actorUsername: req.dbUser!.username, action: 'settings.update', metadata: req.body });

  res.json({ ok: true, settings });
});

export const adminToggleMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const { enabled } = req.body as { enabled?: boolean };
  if (typeof enabled !== 'boolean') throw new AppError('enabled is required', 422, 'VALIDATION_ERROR');

  const settings = await getSettings();
  settings.maintenanceMode = enabled;
  await settings.save();

  await writeAudit({
    actorId: req.telegramId!,
    actorUsername: req.dbUser!.username,
    action: 'settings.maintenance_mode',
    metadata: { enabled },
  });

  res.json({ ok: true, settings });
});

export const adminRunBroadcast = asyncHandler(async (req: Request, res: Response) => {
  const { message, scope, telegramIds, buttons } = req.body as {
    message?: string;
    scope?: BroadcastTarget['scope'];
    telegramIds?: number[];
    buttons?: BroadcastButton[];
  };

  if (!message || !scope) throw new AppError('message and scope are required', 422, 'VALIDATION_ERROR');

  const result = await runBroadcast(
    getBotInstance(),
    message,
    { scope, telegramIds },
    buttons,
    req.telegramId!,
    req.dbUser!.username
  );

  res.json({ ok: true, result });
});
