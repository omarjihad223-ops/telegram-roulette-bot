import { Schema, model, Document } from 'mongoose';

export interface IPrize extends Document {
  key: string; // stable machine key, e.g. "gems_3000"
  name: string; // display name, e.g. "3000 جوهرة" (without emoji — see icon)
  icon: string; // a single emoji representing this prize on the wheel/inventory, e.g. "💎"
  // Custom uploaded image, stored directly in MongoDB (not on local disk). Render's (and
  // most PaaS) local container disk is EPHEMERAL — anything written to disk vanishes on the
  // next restart/redeploy, which is why images used to "work right after upload" but then
  // silently disappear for everyone else later. Storing the bytes in Mongo makes them as
  // durable as the rest of the app's data, with zero extra infrastructure needed.
  imageData?: Buffer | null;
  imageMimeType?: string | null;
  hasImage: boolean; // cheap flag mirroring "imageData is set" — lets list queries know without loading the bytes
  baseWeight: number; // configured probability weight (percent points, sums to 100 across all prizes)
  stock: number; // -1 means unlimited
  isUnlimited: boolean;
  deliveredCount: number;
  pendingCount: number;
  isActive: boolean;
  displayOrder: number;
  requiresManualDelivery: boolean;
  // Price in spin-points to buy this prize directly from the Store. null = not for sale
  // (the normal case — most prizes are wheel-only). Buying does NOT touch `stock` — the
  // wheel's stock and the store's availability are intentionally independent so selling
  // in the store never affects wheel odds/inventory.
  storePrice: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const prizeSchema = new Schema<IPrize>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    icon: { type: String, required: true, default: '🎁' },
    imageData: { type: Buffer, default: null, select: false }, // select:false — never pulled unless explicitly asked (keeps normal queries light)
    imageMimeType: { type: String, default: null },
    hasImage: { type: Boolean, default: false },
    baseWeight: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0 },
    isUnlimited: { type: Boolean, default: false },
    deliveredCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    requiresManualDelivery: { type: Boolean, default: true },
    storePrice: { type: Number, default: null },
  },
  { timestamps: true }
);

export const Prize = model<IPrize>('Prize', prizeSchema);
