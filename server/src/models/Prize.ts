import { Schema, model, Document } from 'mongoose';

export interface IPrize extends Document {
  key: string; // stable machine key, e.g. "gems_3000"
  name: string; // display name, e.g. "3000 جوهرة" (without emoji — see icon)
  icon: string; // a single emoji representing this prize on the wheel/inventory, e.g. "💎"
  baseWeight: number; // configured probability weight (percent points, sums to 100 across all prizes)
  stock: number; // -1 means unlimited
  isUnlimited: boolean;
  deliveredCount: number;
  pendingCount: number;
  isActive: boolean;
  displayOrder: number;
  requiresManualDelivery: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const prizeSchema = new Schema<IPrize>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    icon: { type: String, required: true, default: '🎁' },
    baseWeight: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0 },
    isUnlimited: { type: Boolean, default: false },
    deliveredCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    requiresManualDelivery: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Prize = model<IPrize>('Prize', prizeSchema);
