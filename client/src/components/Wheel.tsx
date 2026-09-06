import React, { useMemo, useRef, useState } from 'react';
import { WHEEL_SLOTS } from './wheelSlots';
import { runSpinAnimation } from './spinEasing';

const SLOT_COUNT = WHEEL_SLOTS.length;

// How many times the 15-slot pattern is repeated to build the scrollable strip.
// Large enough that the periodic "rewind" (see spinTo) is invisible and rare.
const REPEATS = 40;
const STRIP_LENGTH = SLOT_COUNT * REPEATS;

const CARD_W = 92;
const CARD_GAP = 12;
const PITCH = CARD_W + CARD_GAP;

// Extra full laps of the pattern the reel scrolls through before settling on the
// real target, purely for visual drama — has zero effect on which prize was won.
const FULL_LAPS = 6;

// Once the strip has scrolled this many laps in, snap back by whole laps (same
// modulo position, so nothing visibly changes) to stay within STRIP_LENGTH forever.
const REWIND_AFTER_LAPS = REPEATS - 12;
const REWIND_KEEP_LAPS = 6;

// Start resting somewhere comfortably inside the strip, not at the very edge.
const INITIAL_IDX = SLOT_COUNT * 10;

export interface WheelHandle {
  spinTo: (targetSlotIndex: number, durationMs: number, onDone: () => void) => void;
}

export const Wheel = React.forwardRef<WheelHandle, { width?: number }>(function Wheel({ width = 320 }, ref) {
  const [posIdx, setPosIdx] = useState(INITIAL_IDX);
  const [landedAbsIdx, setLandedAbsIdx] = useState<number | null>(null);
  const baseIdxRef = useRef(INITIAL_IDX);

  React.useImperativeHandle(ref, () => ({
    spinTo(targetSlotIndex, durationMs, onDone) {
      setLandedAbsIdx(null);

      const currentIdx = baseIdxRef.current;
      const currentMod = ((currentIdx % SLOT_COUNT) + SLOT_COUNT) % SLOT_COUNT;
      const deltaToTarget = ((targetSlotIndex - currentMod) % SLOT_COUNT + SLOT_COUNT) % SLOT_COUNT;
      const totalDeltaIdx = FULL_LAPS * SLOT_COUNT + deltaToTarget;
      let newIdx = currentIdx + totalDeltaIdx;

      runSpinAnimation({
        durationMs,
        totalRotationDeg: totalDeltaIdx, // unit-agnostic — here it's "slot units", not degrees
        onFrame: (delta) => setPosIdx(currentIdx + delta),
        onDone: () => {
          // Keep the strip from growing forever: rewind by whole laps (invisible — same
          // modulo position) once we're getting close to the end of the rendered array.
          if (newIdx > SLOT_COUNT * REWIND_AFTER_LAPS) {
            const lapsNow = Math.floor(newIdx / SLOT_COUNT);
            const rewindLaps = lapsNow - REWIND_KEEP_LAPS;
            newIdx -= rewindLaps * SLOT_COUNT;
          }
          baseIdxRef.current = newIdx;
          setPosIdx(newIdx);
          setLandedAbsIdx(newIdx);
          onDone();
        },
      });
    },
  }));

  const translateX = useMemo(() => width / 2 - (posIdx * PITCH + CARD_W / 2), [posIdx, width]);

  const cards = useMemo(
    () =>
      Array.from({ length: STRIP_LENGTH }, (_, i) => {
        const slot = WHEEL_SLOTS[i % SLOT_COUNT];
        return { i, slot };
      }),
    []
  );

  return (
    <div className="reel-wrap">
      <div className="reel-pointer reel-pointer-top" />
      <div className="reel-viewport" style={{ width }}>
        <div className="reel-fade reel-fade-left" />
        <div className="reel-fade reel-fade-right" />
        <div className="reel-window" style={{ width: CARD_W + 10 }} />
        <div
          className="reel-strip"
          style={{ transform: `translateX(${translateX}px)`, gap: CARD_GAP }}
        >
          {cards.map(({ i, slot }) => (
            <div
              key={i}
              className={`reel-card${landedAbsIdx === i ? ' reel-card-landed' : ''}`}
              style={{ width: CARD_W }}
            >
              <div className="reel-card-icon">{slot.icon}</div>
              <div className="reel-card-label">{slot.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="reel-pointer reel-pointer-bottom" />
    </div>
  );
});
