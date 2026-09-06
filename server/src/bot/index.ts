import TelegramBot from 'node-telegram-bot-api';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { registerStartHandler } from './start';
import { registerAdminWithdrawalActions } from './adminWithdrawalActions';
import { setBotInstance } from './instance';
import { attachBotInstance } from '../services/notification.service';

export function createBot(): TelegramBot {
  const bot = new TelegramBot(env.BOT_TOKEN, { polling: true });

  bot.on('polling_error', (err) => {
    logger.error({ err }, 'Telegram polling error');
  });

  registerStartHandler(bot);
  registerAdminWithdrawalActions(bot);

  setBotInstance(bot);
  attachBotInstance(bot);

  logger.info('🤖 Telegram bot started (long polling)');
  return bot;
}
