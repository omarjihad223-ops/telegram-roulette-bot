import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  photoUrl?: string;
  isBanned: boolean;
  bannedAt?: Date;
  bannedBy?: number;
  banReason?: string;
  captchaPassed: boolean;
  captchaPassedAt?: Date;
  forcedSubOk: boolean;
  referredBy?: Types.ObjectId | null; // User who referred this user (only ever set once)
  referredByCampaign?: Types.ObjectId | null; // Which reward campaign this referral belongs to
  lastSpinAt?: Date | null;
  totalSpins: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, index: true },
    firstName: String,
    lastName: String,
    languageCode: String,
    photoUrl: String,
    isBanned: { type: Boolean, default: false, index: true },
    bannedAt: Date,
    bannedBy: Number,
    banReason: String,
    captchaPassed: { type: Boolean, default: false },
    captchaPassedAt: Date,
    forcedSubOk: { type: Boolean, default: false },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    referredByCampaign: { type: Schema.Types.ObjectId, ref: 'ReferralCampaign', default: null },
    lastSpinAt: { type: Date, default: null },
    totalSpins: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
