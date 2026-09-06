import { Notification, NotificationType } from '../models/Notification';
import { Types } from 'mongoose';
import { listAllAdminTelegramIds } from './admin.service';
import { logger } from '../config/logger';
import type TelegramBot from 'node-telegram-bot-api';

let botRef: TelegramBot | null = null;

/** Wired up once at startup so services can push Telegram messages without circular imports. */
export function attachBotInstance(bot: TelegramBot) {
  botRef = bot;
}

export async function createNotification(params: {
  userId: Types.ObjectId;
  telegramId: number;
  type: NotificationType;
  title: string;
  body: string;
  pushToTelegram?: boolean;
}) {
  const notif = await Notification.create({
    user: params.userId,
    telegramId: params.telegramId,
    type: params.type,
    title: params.title,
    body: params.body,
  });

  if (params.pushToTelegram !== false && botRef) {
    try {
      await botRef.sendMessage(params.telegramId, `${params.title}\n\n${params.body}`);
    } catch (err) {
      logger.warn({ err, telegramId: params.telegramId }, 'failed to push telegram notification');
    }
  }

  return notif;
}

/** Broadcasts a system message to every owner/developer (used for stock alerts, withdrawal requests). */
export async function notifyAllAdmins(type: NotificationType, title: string, body: string) {
  const adminIds = await listAllAdminTelegramIds();
  if (botRef) {
    await Promise.all(
      adminIds.map((id) =>
        botRef!.sendMessage(id, `${title}\n\n${body}`).catch((err) => {
          logger.warn({ err, id }, 'failed to notify admin');
        })
      )
    );
  }
}

/**
 * Sends a new-withdrawal alert to every admin, with a single "📋 جلب الاحالات" button.
 * Pressing it (handled in bot/adminWithdrawalActions.ts) reveals the invitee list plus
 * Accept/Reject buttons — admins are never shown Accept/Reject before they've had a chance
 * to check the referrals for fraud.
 */
export async function notifyAdminsNewWithdrawal(params: {
  withdrawalId: string;
  prizeName: string;
  username?: string;
  telegramId: number;
}) {
  const { withdrawalId, prizeName, username, telegramId } = params;
  const adminIds = await listAllAdminTelegramIds();
  if (!botRef) return;

  const text =
    `🎁 طلب سحب جديد\n\n` +
    `المنتج:\n${prizeName}\n\n` +
    `الشخص:\n${username ? '@' + username : '-'}\n\n` +
    `أيدي الشخص:\n${telegramId}\n\n` +
    `وقت السحب:\n${new Date().toLocaleString('ar-EG')}`;

  await Promise.all(
    adminIds.map((id) =>
      botRef!
        .sendMessage(id, text, {
          reply_markup: {
            inline_keyboard: [[{ text: '📋 جلب الاحالات', callback_data: `wd_refs_${withdrawalId}` }]],
          },
        })
        .catch((err) => {
          logger.warn({ err, id }, 'failed to notify admin of new withdrawal');
        })
    )
  );
}

export async function listUserNotifications(telegramId: number, limit = 50) {
  return Notification.find({ telegramId }).sort({ createdAt: -1 }).limit(limit);
}

export async function markNotificationsRead(telegramId: number, ids?: string[]) {
  const filter: Record<string, unknown> = { telegramId };
  if (ids && ids.length > 0) filter._id = { $in: ids };
  await Notification.updateMany(filter, { isRead: true });
}
