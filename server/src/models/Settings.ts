import { Schema, model, Document } from 'mongoose';

export interface ISettings extends Document {
  singleton: 'main';
  maintenanceMode: boolean;
  spinCooldownHours: number;
  prizeExpiryHours: number;
  expiryReminderIntervalHours: number;
  // Legacy referral-bonus configuration. Kept only so old data/API calls don't break;
  // no longer wired to anything — see claimReferralsRequired below for the current system.
  referralBonusEnabled: boolean;
  referralBonusPrizeKey: string | null; // references Prize.key, e.g. "referral_bonus"
  // How many qualified referrals a user must bring in (through that specific prize's own
  // link) before they're allowed to withdraw a wheel prize.
  claimReferralsRequired: number;
  // Optional image sent as part of the rich "share your prize" card the bot sends the
  // user (which they then forward to friends). Stored directly in MongoDB (not local disk —
  // see the same note on Prize.imageData for why). hasShareImage=false means plain text.
  shareImageData: Buffer | null;
  shareImageMimeType: string | null;
  hasShareImage: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    singleton: { type: String, default: 'main', unique: true },
    maintenanceMode: { type: Boolean, default: false },
    spinCooldownHours: { type: Number, default: 24 },
    prizeExpiryHours: { type: Number, default: 24 },
    expiryReminderIntervalHours: { type: Number, default: 6 },
    referralBonusEnabled: { type: Boolean, default: false },
    referralBonusPrizeKey: { type: String, default: null },
    claimReferralsRequired: { type: Number, default: 5 },
    shareImageData: { type: Buffer, default: null, select: false },
    shareImageMimeType: { type: String, default: null },
    hasShareImage: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Settings = model<ISettings>('Settings', settingsSchema);

export async function getSettings() {
  let settings = await Settings.findOne({ singleton: 'main' });
  if (!settings) {
    settings = await Settings.create({ singleton: 'main' });
  }
  return settings;
}
