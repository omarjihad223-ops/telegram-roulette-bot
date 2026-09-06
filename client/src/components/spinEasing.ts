/**
 * Speed profile (normalized time t in [0,1]):
 *  - [0, 0.25]  -> constant, very high speed (the "flick")
 *  - [0.25, 1]  -> smooth cubic decay to a full stop, no sudden jerk
 * Over a 12s spin this maps to roughly: 0-3s fast, 3-8s slowing, 8-11s clearly
 * slower, 11-12s gentle final stop — matching the requested feel without a jump cut.
 */
function speedAt(t: number): number {
  if (t <= 0.25) return 1;
  const u = (t - 0.25) / 0.75;
  return Math.pow(1 - u, 3);
}

// Precomputed analytical integral of speedAt over [0,1], used to normalize total rotation.
const TOTAL_SPEED_INTEGRAL = 0.25 + 0.75 * 0.25; // = 0.4375

export interface SpinAnimationOptions {
  durationMs: number;
  totalRotationDeg: number;
  onFrame: (currentRotationDeg: number) => void;
  onDone: () => void;
}

export function runSpinAnimation(opts: SpinAnimationOptions): () => void {
  const { durationMs, totalRotationDeg, onFrame, onDone } = opts;
  let start: number | null = null;
  let cancelled = false;
  let accumulatedDeg = 0;
  let lastT = 0;

  function frame(now: number) {
    if (cancelled) return;
    if (start === null) start = now;
    const elapsed = now - start;
    const t = Math.min(1, elapsed / durationMs);

    // Numerically integrate speed(t) * dt to get smooth, monotonic rotation progress.
    const dt = t - lastT;
    const v = speedAt(t);
    accumulatedDeg += (v / TOTAL_SPEED_INTEGRAL) * dt * totalRotationDeg;
    lastT = t;

    if (t >= 1) {
      onFrame(totalRotationDeg); // snap exactly to target regardless of float drift
      onDone();
      return;
    }

    onFrame(accumulatedDeg);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  return () => {
    cancelled = true;
  };
}
