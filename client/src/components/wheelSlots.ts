export interface WheelSlot {
  key: string;
  icon: string;
  imageUrl: string | null;
  label: string;
}

export interface PublicPrize {
  key: string;
  name: string;
  icon: string;
  imageUrl: string | null;
}

const EMPTY_SLOT: WheelSlot = { key: '__empty__', icon: '🍀', imageUrl: null, label: 'حظ أوفر' };

// How many real prize cards appear between each neutral "حظ أوفر" card, purely visual.
const EMPTY_EVERY = 4;

/**
 * Builds the wheel's visual card list directly from the live prize list the server just
 * returned (GET /wheel/prizes) — the same Prize documents the spin itself draws from, so
 * there is no separate hardcoded copy that can ever drift out of sync (a mismatched/renamed
 * key used to make the wheel land on a random card unrelated to the real prize).
 *
 * '__empty__' is a dedicated "no prize this time" slot, interspersed at a fixed interval.
 * When a spin doesn't win anything, the wheel must land on one of THESE — never on a random
 * real prize card, which would look exactly like winning something and then being told
 * otherwise.
 */
export function buildWheelSlots(prizes: PublicPrize[]): WheelSlot[] {
  const slots: WheelSlot[] = [];
  prizes.forEach((p, i) => {
    slots.push({ key: p.key, icon: p.icon, imageUrl: p.imageUrl, label: p.name });
    if ((i + 1) % EMPTY_EVERY === 0) slots.push(EMPTY_SLOT);
  });
  if (slots.length === 0 || slots[slots.length - 1].key !== '__empty__') slots.push(EMPTY_SLOT);
  return slots;
}

export function findSlotIndexForKey(slots: WheelSlot[], key: string | undefined): number {
  const emptyIndices = slots.reduce<number[]>((acc, s, i) => {
    if (s.key === '__empty__') acc.push(i);
    return acc;
  }, []);
  const randomEmptyOrAny = () =>
    emptyIndices.length ? emptyIndices[Math.floor(Math.random() * emptyIndices.length)] : Math.floor(Math.random() * slots.length);

  // No win → always land on one of the neutral "حظ أوفر" slots, chosen at random among
  // just those, never on a real-looking prize.
  if (!key) return randomEmptyOrAny();

  const idx = slots.findIndex((s) => s.key === key);
  // This should not happen now that the wheel and the spin share one canonical prize list
  // server-side, but fail safe onto a neutral slot rather than a random real-looking prize
  // if it ever does — the landingOverride still displays the true won prize regardless of
  // which position the animation lands on, so this only affects which card LOOKS occupied.
  return idx === -1 ? randomEmptyOrAny() : idx;
}
