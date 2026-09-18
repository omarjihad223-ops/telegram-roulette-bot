import mongoose from 'mongoose';
import type TelegramBot from 'node-telegram-bot-api';
import { Task, ITask } from '../models/Task';
import { UserTask } from '../models/UserTask';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { fetchChatInfo, checkMembership } from './forcedSub.service';
import { assertBotIsAdminInChat, normalizeChatIdentifier } from './forcedChatAdmin.service';
import { writeAudit } from '../models/AuditLog';

export async function listTasks() {
  return Task.find({}).sort({ createdAt: -1 });
}

export async function createSubscriptionTask(
  bot: TelegramBot,
  input: { chatId: string; title?: string; rewardPoints: number },
  actorId: number,
  actorUsername?: string
) {
  const chatId = normalizeChatIdentifier(input.chatId);
  if (!chatId) throw new AppError('chatId is required', 422, 'VALIDATION_ERROR');
  if (!Number.isFinite(input.rewardPoints) || input.rewardPoints < 0) {
    throw new AppError('rewardPoints must be zero or greater', 422, 'VALIDATION_ERROR');
  }
  if (await Task.exists({ chatId })) throw new AppError('Task already exists for this chat', 409, 'ALREADY_EXISTS');

  await assertBotIsAdminInChat(bot, chatId);
  const info = await fetchChatInfo(bot, chatId);
  const task = await Task.create({
    chatId,
    title: input.title?.trim() || info?.title || chatId,
    chatType: info?.type ?? 'unknown',
    inviteLink: info?.inviteLink,
    rewardPoints: input.rewardPoints,
    createdBy: actorId,
    isActive: true,
  });
  await writeAudit({ actorId, actorUsername, action: 'task.add', target: String(task._id), metadata: { chatId, rewardPoints: input.rewardPoints } });
  return task;
}

export async function updateTask(
  bot: TelegramBot,
  id: string,
  input: { chatId?: string; title?: string; rewardPoints?: number; isActive?: boolean },
  actorId: number,
  actorUsername?: string
) {
  const task = await Task.findById(id);
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
  if (input.rewardPoints !== undefined && (!Number.isFinite(input.rewardPoints) || input.rewardPoints < 0)) {
    throw new AppError('rewardPoints must be zero or greater', 422, 'VALIDATION_ERROR');
  }
  if (input.chatId && input.chatId !== task.chatId) {
    const chatId = normalizeChatIdentifier(input.chatId);
    if (await Task.exists({ chatId, _id: { $ne: task._id } })) throw new AppError('Task already exists for this chat', 409, 'ALREADY_EXISTS');
    await assertBotIsAdminInChat(bot, chatId);
    const info = await fetchChatInfo(bot, chatId);
    task.chatId = chatId;
    task.chatType = info?.type ?? 'unknown';
    task.inviteLink = info?.inviteLink;
  }
  if (input.title !== undefined) task.title = input.title.trim() || task.title;
  if (input.rewardPoints !== undefined) task.rewardPoints = input.rewardPoints;
  if (input.isActive !== undefined) task.isActive = input.isActive;
  await task.save();
  await writeAudit({ actorId, actorUsername, action: 'task.update', target: id, metadata: input });
  return task;
}

export async function deleteTask(id: string, actorId: number, actorUsername?: string) {
  const task = await Task.findByIdAndDelete(id);
  if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
  await UserTask.deleteMany({ task: task._id });
  await writeAudit({ actorId, actorUsername, action: 'task.delete', target: id });
}

export async function listTasksForUser(userId: mongoose.Types.ObjectId | string) {
  const tasks = await Task.find({ isActive: true }).sort({ createdAt: -1 });
  const claimed = await UserTask.find({ user: userId }).select('task').lean();
  const claimedIds = new Set(claimed.map((item) => String(item.task)));
  return tasks.map((task) => ({ task, claimed: claimedIds.has(String(task._id)) }));
}

export async function claimTask(bot: TelegramBot, telegramId: number, taskId: string) {
  const session = await mongoose.startSession();
  try {
    let result: { rewardPoints: number; remainingBalance: number } | null = null;
    await session.withTransaction(async () => {
      const user = await User.findOne({ telegramId }).session(session);
      const task = await Task.findOne({ _id: taskId, isActive: true }).session(session);
      if (!user || !task) throw new AppError('Task not found', 404, 'NOT_FOUND');
      const subscribed = await checkMembership(bot, task, telegramId);
      if (!subscribed) throw new AppError('Subscribe to the task chat first', 403, 'TASK_NOT_COMPLETED');
      try {
        await UserTask.create([{ user: user._id, task: task._id, telegramId }], { session });
      } catch (err: any) {
        if (err?.code === 11000) throw new AppError('Task already claimed', 409, 'TASK_ALREADY_CLAIMED');
        throw err;
      }
      await User.updateOne({ _id: user._id }, { $inc: { spinPoints: task.rewardPoints } }, { session });
      result = { rewardPoints: task.rewardPoints, remainingBalance: user.spinPoints + task.rewardPoints };
    });
    return result;
  } finally {
    await session.endSession();
  }
}