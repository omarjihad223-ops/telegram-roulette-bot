import TelegramBot from 'node-telegram-bot-api';
import { User } from '../models/User';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { findOrCreateUser } from '../services/user.service';
import { registerReferralIfNew } from '../services/referral.service';
import { getClaimTaskByToken, parseTaskTokenFromStartParam } from '../services/claimTask.service';
import { checkAllForcedChats } from '../services/forcedSub.service';
import { getSettings } from '../models/Settings';
import { getAdminRole } from '../services/admin.service';

function buildMiniAppKeyboard(): TelegramBot.SendMessageOptions {
  if (!env.MINI_APP_URL) return {};
  return {
    reply_markup: {
      inline_keyboard: [[{ text: '🚀 فتح البوت', web_app: { url: env.MINI_APP_URL } }]],
    },
  };
}

export function registerStartHandler(bot: TelegramBot) {
  bot.onText(/^\/start(?:\s+(.+))?$/, async (msg, match) => {
    try {
      const telegramUser = msg.from;
      if (!telegramUser) return;

      const { user, isNew } = await findOrCreateUser({
        id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        language_code: telegramUser.language_code,
      });

      if (user.isBanned) {
        await bot.sendMessage(msg.chat.id, '🚫 أنت محظور من استخدام هذا البوت.');
        return;
      }

      const settings = await getSettings();
      const role = await getAdminRole(user.telegramId);
      if (settings.maintenanceMode && !role) {
        await bot.sendMessage(msg.chat.id, '🔧 البوت في وضع الصيانة حالياً. حاول لاحقاً.');
        return;
      }

      const startParam = match?.[1]?.trim();
      const taskToken = parseTaskTokenFromStartParam(startParam);

      if (taskToken) {
        const task = await getClaimTaskByToken(taskToken);
        if (task) {
          const outcome = await registerReferralIfNew({
            newUser: user,
            task,
            isBrandNewUser: isNew,
          });
          logger.info({ outcome, taskToken, newUserId: user.telegramId }, 'referral registration attempt');
        } else {
          logger.warn({ taskToken }, 'start param referenced an unknown claim task token');
        }
      }

      const { allOk, missing } = await checkAllForcedChats(bot, user.telegramId);

      if (!allOk) {
        const buttons: TelegramBot.InlineKeyboardButton[][] = missing.map((c) => [
          { text: `📢 ${c.title}`, url: c.inviteLink || `https://t.me/${c.chatId.replace('@', '')}` },
        ]);
        buttons.push([{ text: '✅ تحقق من الاشتراك', callback_data: 'check_forced_sub' }]);

        await bot.sendMessage(
          msg.chat.id,
          'قبل ما تكدر تستخدم البوت، لازم تشترك بالقنوات/الكروبات التالية:',
          { reply_markup: { inline_keyboard: buttons } }
        );
        return;
      }

      user.forcedSubOk = true;
      await user.save();

      await bot.sendMessage(
        msg.chat.id,
        `أهلاً ${telegramUser.first_name || ''} 👋\n\nافتح البوت لتشوف الفرة المجانية، حقيبتك، والمهام.`,
        buildMiniAppKeyboard()
      );
    } catch (err) {
      logger.error({ err }, 'error handling /start');
    }
  });

  bot.on('callback_query', async (query) => {
    if (query.data !== 'check_forced_sub') return;
    try {
      const telegramId = query.from.id;
      const { allOk, missing } = await checkAllForcedChats(bot, telegramId);

      if (allOk) {
        await User.updateOne({ telegramId }, { forcedSubOk: true });
        await bot.answerCallbackQuery(query.id, { text: '✅ تم التحقق! تقدر تفتح البوت الحين.' });
        if (query.message) {
          await bot.sendMessage(query.message.chat.id, 'تم التحقق من اشتراكك ✅', buildMiniAppKeyboard());
        }
      } else {
        await bot.answerCallbackQuery(query.id, {
          text: '❌ لسا ناقصك اشتراك ببعض القنوات.',
          show_alert: true,
        });
      }
    } catch (err) {
      logger.error({ err }, 'error handling check_forced_sub callback');
    }
  });
}
