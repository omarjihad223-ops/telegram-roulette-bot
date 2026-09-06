import { describe, it, expect } from 'vitest';
import { weightedPick, secureRandomFloat } from '../src/utils/random';

describe('secureRandomFloat', () => {
  it('returns values within [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const v = secureRandomFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('weightedPick', () => {
  it('throws on empty total weight', () => {
    expect(() => weightedPick([{ weight: 0 }, { weight: 0 }])).toThrow();
  });

  it('always picks the only item with weight > 0', () => {
    const items = [{ id: 'a', weight: 0 }, { id: 'b', weight: 100 }, { id: 'c', weight: 0 }];
    for (let i = 0; i < 200; i++) {
      expect(weightedPick(items).id).toBe('b');
    }
  });

  it('approximates the configured distribution over many trials', () => {
    const items = [
      { id: 'common', weight: 90 },
      { id: 'rare', weight: 10 },
    ];
    const counts: Record<string, number> = { common: 0, rare: 0 };
    const trials = 20000;
    for (let i = 0; i < trials; i++) {
      counts[weightedPick(items).id] += 1;
    }
    const commonRatio = counts.common / trials;
    // Statistical tolerance band around the expected 0.9 ratio.
    expect(commonRatio).toBeGreaterThan(0.87);
    expect(commonRatio).toBeLessThan(0.93);
  });

  it('never selects an item with zero weight even among many candidates', () => {
    const items = [
      { id: 'ghost1', weight: 0 },
      { id: 'ghost2', weight: 0 },
      { id: 'winner', weight: 5 },
      { id: 'ghost3', weight: 0 },
    ];
    for (let i = 0; i < 500; i++) {
      expect(weightedPick(items).id).toBe('winner');
    }
  });
});
