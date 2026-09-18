import { Schema, model, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  chatId: string;
  chatType: 'channel' | 'group' | 'unknown';
  inviteLink?: string;
  rewardPoints: number;
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    chatId: { type: String, required: true, unique: true, index: true },
    chatType: { type: String, enum: ['channel', 'group', 'unknown'], default: 'unknown' },
    inviteLink: String,
    rewardPoints: { type: Number, required: true, min: 0, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Task = model<ITask>('Task', taskSchema);