import TelegramBot from 'node-telegram-bot-api';
import { ForcedChat, IForcedChat } from '../models/ForcedChat';
import { logger } from '../config/logger';

export interface ChannelCheckResult {
  chatId: string;
  title: string;
  isSubscribed: boolean;
  inviteLink?: string;
}

const MEMBER_STATUSES = new Set(['creator', 'administrator', 'member', 'restricted']);

/**
 * Checks a single user's membership against one forced chat.
 * Never trusts client-supplied subscription claims — always queries Telegram directly.
 */
export async function checkMembership(
  bot: TelegramBot,
  chat: IForcedChat,
  telegramId: number
): Promise<boolean> {
  try {
    const member = await bot.getChatMember(chat.chatId, telegramId);
    if (member.status === 'left' || member.status === 'kicked') return false;
    return MEMBER_STATUSES.has(member.status);
  } catch (err) {
    logger.warn({ err, chatId: chat.chatId, telegramId }, 'forced-sub membership check failed');
    // If the bot cannot check (e.g. not an admin in that chat, or chat unreachable),
    // fail closed: treat as not subscribed rather than silently trusting the user.
    return false;
  }
}

export async function checkAllForcedChats(
  bot: TelegramBot,
  telegramId: number
): Promise<{ allOk: boolean; missing: ChannelCheckResult[] }> {
  const chats = await ForcedChat.find({ isActive: true });
  if (chats.length === 0) return { allOk: true, missing: [] };

  const results = await Promise.all(
    chats.map(async (chat) => {
      const isSubscribed = await checkMembership(bot, chat, telegramId);
      return {
        chatId: chat.chatId,
        title: chat.title || chat.chatId,
        isSubscribed,
        inviteLink: chat.inviteLink,
      } as ChannelCheckResult;
    })
  );

  const missing = results.filter((r) => !r.isSubscribed);
  return { allOk: missing.length === 0, missing };
}

export async function fetchChatInfo(bot: TelegramBot, chatIdOrUsername: string) {
  try {
    const chat = await bot.getChat(chatIdOrUsername);
    let inviteLink: string | undefined;
    if ('username' in chat && chat.username) {
      inviteLink = `https://t.me/${chat.username}`;
    } else if ('invite_link' in chat && chat.invite_link) {
      inviteLink = chat.invite_link as string;
    }
    return {
      id: String(chat.id),
      title: 'title' in chat ? (chat.title as string) : chatIdOrUsername,
      type: chat.type === 'channel' ? ('channel' as const) : ('group' as const),
      inviteLink,
    };
  } catch (err) {
    logger.warn({ err, chatIdOrUsername }, 'failed to fetch chat info');
    return null;
  }
}
