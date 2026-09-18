import { Schema, model, Document, Types } from 'mongoose';

export interface IUserTask extends Document {
  user: Types.ObjectId;
  task: Types.ObjectId;
  telegramId: number;
  claimedAt: Date;
}

const userTaskSchema = new Schema<IUserTask>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    telegramId: { type: Number, required: true, index: true },
    claimedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userTaskSchema.index({ user: 1, task: 1 }, { unique: true });

export const UserTask = model<IUserTask>('UserTask', userTaskSchema);