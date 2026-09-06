import crypto from 'crypto';

/**
 * Returns a cryptographically-secure random float in [0, 1).
 * Using crypto instead of Math.random() for fairness-critical selection (roulette outcome).
 */
export function secureRandomFloat(): number {
  const buf = crypto.randomBytes(4);
  const int = buf.readUInt32BE(0);
  return int / 0x100000000; // divide by 2^32
}

/**
 * Weighted random pick. `items` must be a non-empty array of { weight } objects.
 * Weights don't need to sum to 1; they are normalized internally.
 */
export function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  if (total <= 0) {
    throw new Error('weightedPick: total weight must be > 0');
  }
  const r = secureRandomFloat() * total;
  let acc = 0;
  for (const item of items) {
    acc += item.weight;
    if (r < acc) return item;
  }
  return items[items.length - 1];
}
