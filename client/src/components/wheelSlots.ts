export interface WheelSlot {
  key: string;
  icon: string;
  label: string;
}

// Visual arrangement only — rare-looking prizes are spread apart so they never sit
// next to each other, per the design spec. This ordering has NO relationship to the
// actual server-side probability of winning each one.
export const WHEEL_SLOTS: WheelSlot[] = [
  { key: 'gems_3000', icon: '💎', label: '3000 جوهرة' },
  { key: 'nft_black', icon: '🖤', label: 'NFT أسود' },
  { key: 'stars_15', icon: '⭐', label: '15 نجمة' },
  { key: 'asia_credit_300', icon: '🏆', label: '300 رصيد آسيا' },
  { key: 'asia_credit_1', icon: '📱', label: '1 رصيد آسيا' },
  { key: 'stars_1000', icon: '🌟', label: '1000 نجمة' },
  { key: 'gems_5000', icon: '💠', label: '5000 جوهرة' },
  { key: 'extreme_account_20', icon: '⚡', label: '20 حساب إكستريم' },
  { key: 'stars_25', icon: '✨', label: '25 نجمة' },
  { key: 'gems_7000', icon: '🔷', label: '7000 جوهرة' },
  { key: 'asia_credit_5', icon: '📲', label: '5 رصيد آسيا' },
  { key: 'stars_200', icon: '🌠', label: '200 نجمة' },
  { key: 'asia_credit_140', icon: '💳', label: '140 رصيد آسيا' },
  { key: 'stars_400', icon: '🎆', label: '400 نجمة' },
  { key: 'nft_normal', icon: '🖼️', label: 'NFT عادي' },
];

export function findSlotIndexForKey(key: string | undefined): number {
  if (!key) return Math.floor(Math.random() * WHEEL_SLOTS.length);
  const idx = WHEEL_SLOTS.findIndex((s) => s.key === key);
  return idx === -1 ? Math.floor(Math.random() * WHEEL_SLOTS.length) : idx;
}
