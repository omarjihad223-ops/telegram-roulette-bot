import { Schema, model, Document, Types } from 'mongoose';

export type GiftLinkRewardType = 'points' | 'daily_spin' | 'prize';
export type GiftLinkStatus = 'unused' | 'redeemed' | 'expired' | 'revoked';

export interface IGiftLink extends Document {
  token: string;
  rewardType: GiftLinkRewardType;
  pointsAmount: number | null;
  prize?: Types.ObjectId | null;
  prizeNameSnapshot?: string | null;
  createdByTelegramId: number;
  status: GiftLinkStatus;
  redeemedByTelegramId?: number | null;
  redeemedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const giftLinkSchema = new Schema<IGiftLink>(
  {
    token: { type: String, required: true, unique: true, index: true },
    rewardType: { type: String, enum: ['points', 'daily_spin', 'prize'], required: true },
    pointsAmount: { type: Number, default: null },
    prize: { type: Schema.Types.ObjectId, ref: 'Prize', default: null },
    prizeNameSnapshot: { type: String, default: null },
    createdByTelegramId: { type: Number, required: true, index: true },
    status: { type: String, enum: ['unused', 'redeemed', 'expired', 'revoked'], default: 'unused', index: true },
    redeemedByTelegramId: { type: Number, default: null },
    redeemedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

giftLinkSchema.index({ status: 1, expiresAt: 1 });

export const GiftLink = model<IGiftLink>('GiftLink', giftLinkSchema);