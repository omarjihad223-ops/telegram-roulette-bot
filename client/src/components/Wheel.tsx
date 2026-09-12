import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WheelSlot } from './wheelSlots';
import { runSpinAnimation } from './spinEasing';

// How many times the slot pattern is repeated to build the scrollable strip.
// Large enough that the periodic "rewind" (see spinTo) is invisible and rare.
const REPEATS = 40;

const CARD_W = 92;
const CARD_GAP = 12;
const PITCH = CARD_W + CARD_GAP;

// Extra full laps of the pattern the reel scrolls through before settling on the
// real target, purely for visual drama — has zero effect on which prize was won.
const FULL_LAPS = 6;

// Once the strip has scrolled this many laps in, snap back by whole laps (same
// modulo position, so nothing visibly changes) to stay bounded forever.
const REWIND_KEEP_LAPS = 6;

export interface WheelLandingContent {
  icon: string;
  imageUrl: string | null;
  label: string;
  key?: string;
}

export interface WheelHandle {
  spinTo: (
    targetSlotIndex: number,
    durationMs: number,
    onDone: () => void,
    landingContent?: WheelLandingContent | null
  ) => void;
}

export const Wheel = React.forwardRef<
  WheelHandle,
  { slots: WheelSlot[]; width?: number; initialLanding?: { slotIndex: number; content: WheelLandingContent } | null }
>(function Wheel({ slots, width = 320, initialLanding }, ref) {
  const slotCount = slots.length || 1;
  const stripLength = slotCount * REPEATS;
  const rewindAfterLaps = REPEATS - 12;
  // If we already know the true last result (from the server, via /me), rest right on that
  // slot from the very first render — never on an arbitrary position. This is what actually
  // fixes "the wheel shows the wrong prize": it was never wrong mid-spin, it just had no
  // memory of anything once the page was freshly opened/revisited, so it defaulted to
  // whatever card happened to sit at an arbitrary fixed offset.
  const initialIdx =
    initialLanding && slotCount > 0 ? slotCount * 10 + ((initialLanding.slotIndex % slotCount) + slotCount) % slotCount : slotCount * 10;

  const [posIdx, setPosIdx] = useState(initialIdx);
  const [landedAbsIdx, setLandedAbsIdx] = useState<number | null>(initialLanding ? initialIdx : null);
  // What the server says was actually won, for THIS spin — always wins over slots[i] when
  // rendering the landed card, so the wheel can never visually disagree with the prize the
  // player actually receives, no matter what.
  const [landingOverride, setLandingOverride] = useState<WheelLandingContent | null>(initialLanding?.content ?? null);
  const baseIdxRef = useRef(initialIdx);
  const isSpinningRef = useRef(false);

  // initialLanding often arrives slightly AFTER this component's first render (the parent
  // page kicks off a refresh-from-server on mount, which resolves a beat later) — a plain
  // useState initial value would miss that update entirely. This keeps the rest position in
  // sync with whatever the server says is true, for as long as no real spin is in flight.
  useEffect(() => {
    if (isSpinningRef.current || !initialLanding || slotCount <= 0) return;
    const target = slotCount * 10 + (((initialLanding.slotIndex % slotCount) + slotCount) % slotCount);
    baseIdxRef.current = target;
    setPosIdx(target);
    setLandedAbsIdx(target);
    setLandingOverride(initialLanding.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLanding?.slotIndex, initialLanding?.content.key, slotCount]);

  React.useImperativeHandle(
    ref,
    () => ({
      spinTo(targetSlotIndex, durationMs, onDone, landingContent) {
        isSpinningRef.current = true;
        setLandedAbsIdx(null);
        setLandingOverride(null);

        const currentIdx = baseIdxRef.current;
        const currentMod = ((currentIdx % slotCount) + slotCount) % slotCount;
        const deltaToTarget = ((targetSlotIndex - currentMod) % slotCount + slotCount) % slotCount;
        const totalDeltaIdx = FULL_LAPS * slotCount + deltaToTarget;
        let newIdx = currentIdx + totalDeltaIdx;

        runSpinAnimation({
          durationMs,
          totalRotationDeg: totalDeltaIdx, // unit-agnostic — here it's "slot units", not degrees
          onFrame: (delta) => setPosIdx(currentIdx + delta),
          onDone: () => {
            // Keep the strip from growing forever: rewind by whole laps (invisible — same
            // modulo position) once we're getting close to the end of the rendered array.
            if (newIdx > slotCount * rewindAfterLaps) {
              const lapsNow = Math.floor(newIdx / slotCount);
              const rewindLaps = lapsNow - REWIND_KEEP_LAPS;
              newIdx -= rewindLaps * slotCount;
            }
            baseIdxRef.current = newIdx;
            setPosIdx(newIdx);
            setLandedAbsIdx(newIdx);
            if (landingContent) setLandingOverride(landingContent);
            isSpinningRef.current = false;
            onDone();
          },
        });
      },
    }),
    [slotCount, rewindAfterLaps]
  );

  const translateX = useMemo(() => width / 2 - (posIdx * PITCH + CARD_W / 2), [posIdx, width]);

  const cards = useMemo(
    () =>
      Array.from({ length: stripLength }, (_, i) => {
        const slot = slots[i % slotCount];
        return { i, slot };
      }),
    [slots, slotCount, stripLength]
  );

  return (
    <div className="reel-wrap">
      <div className="reel-pointer reel-pointer-top" />
      <div className="reel-viewport" style={{ width }}>
        <div className="reel-fade reel-fade-left" />
        <div className="reel-fade reel-fade-right" />
        <div className="reel-strip" style={{ transform: `translateX(${translateX}px)`, gap: CARD_GAP }}>
          {cards.map(({ i, slot }) => {
            const isLanded = landedAbsIdx === i;
            const display = isLanded && landingOverride ? landingOverride : slot;
            return (
              <div key={i} className={`reel-card${isLanded ? ' reel-card-landed' : ''}`} style={{ width: CARD_W }}>
                {display.imageUrl ? (
                  <img src={display.imageUrl} alt="" className="reel-card-image" />
                ) : (
                  <div className="reel-card-icon">{display.icon}</div>
                )}
                <div className="reel-card-label">{display.label}</div>
                {isLanded && (
                  <div style={{ fontSize: 8, color: 'var(--text-dim)', opacity: 0.7, marginTop: 2 }}>
                    slot:{slot.key} won:{landingOverride?.key ?? '?'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="reel-pointer reel-pointer-bottom" />
    </div>
  );
});
