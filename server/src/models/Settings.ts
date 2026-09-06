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
