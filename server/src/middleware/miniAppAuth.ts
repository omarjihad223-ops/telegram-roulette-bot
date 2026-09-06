import { Request, Response, NextFunction } from 'express';
import { verifyTelegramInitData } from '../utils/telegramAuth';
import { findOrCreateUser } from '../services/user.service';
import { getSettings } from '../models/Settings';
import { getAdminRole } from '../services/admin.service';
import { AppError } from '../utils/AppError';

/**
 * Every Mini App API request must carry the raw Telegram initData string in the
 * `X-Telegram-Init-Data` header. We verify its HMAC signature (proving it really came
 * from Telegram and wasn't forged/edited client-side) before trusting anything in it —
 * per section 5 of the spec, we never trust a client-supplied user_id directly.
 */
export async function miniAppAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const initData = req.header('X-Telegram-Init-Data');
    if (!initData) {
      throw new AppError('Missing Telegram init data', 401, 'UNAUTHORIZED');
    }

    const parsed = verifyTelegramInitData(initData);
    const { user, isNew } = await findOrCreateUser(parsed.user);

    if (user.isBanned) {
      throw new AppError('Your account is banned', 403, 'BANNED');
    }

    const settings = await getSettings();
    const role = await getAdminRole(user.telegramId);
    if (settings.maintenanceMode && role === null) {
      throw new AppError('Under maintenance', 503, 'MAINTENANCE');
    }

    req.dbUser = user;
    req.telegramId = user.telegramId;
    req.adminRole = role;
    (req as Request & { isNewUser?: boolean; startParam?: string }).isNewUser = isNew;
    (req as Request & { isNewUser?: boolean; startParam?: string }).startParam = parsed.startParam;

    next();
  } catch (err) {
    next(err);
  }
}
