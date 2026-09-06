import React, { useMemo, useRef, useState } from 'react';
import { WHEEL_SLOTS } from './wheelSlots';
import { runSpinAnimation } from './spinEasing';

const SLOT_COUNT = WHEEL_SLOTS.length;
const SLOT_ANGLE = 360 / SLOT_COUNT;
const COLORS = ['#3a1665', '#4b1d82'];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export interface WheelHandle {
  spinTo: (targetSlotIndex: number, durationMs: number, onDone: () => void) => void;
}

export const Wheel = React.forwardRef<WheelHandle, { size?: number }>(function Wheel({ size = 300 }, ref) {
  const [rotation, setRotation] = useState(0);
  const baseRotationRef = useRef(0);

  React.useImperativeHandle(ref, () => ({
    spinTo(targetSlotIndex, durationMs, onDone) {
      const slotCenterAngle = targetSlotIndex * SLOT_ANGLE + SLOT_ANGLE / 2;
      // Pointer is fixed at the top (0deg). We need the slot's center to land there,
      // rotating clockwise, plus several full spins for visual drama.
      const fullSpins = 8;
      const currentMod = baseRotationRef.current % 360;
      const targetMod = (360 - slotCenterAngle) % 360;
      let deltaToTarget = targetMod - currentMod;
      if (deltaToTarget < 0) deltaToTarget += 360;

      const totalRotationDeg = fullSpins * 360 + deltaToTarget;
      const startRotation = baseRotationRef.current;

      runSpinAnimation({
        durationMs,
        totalRotationDeg,
        onFrame: (deg) => setRotation(startRotation + deg),
        onDone: () => {
          baseRotationRef.current = startRotation + totalRotationDeg;
          onDone();
        },
      });
    },
  }));

  const cx = 150;
  const cy = 150;
  const r = 148;

  const slices = useMemo(
    () =>
      WHEEL_SLOTS.map((slot, i) => {
        const startAngle = i * SLOT_ANGLE;
        const endAngle = startAngle + SLOT_ANGLE;
        const midAngle = startAngle + SLOT_ANGLE / 2;
        const labelPos = polarToCartesian(cx, cy, r * 0.68, midAngle);
        return (
          <g key={slot.key}>
            <path d={describeSlice(cx, cy, r, startAngle, endAngle)} fill={COLORS[i % 2]} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            <text
              x={labelPos.x}
              y={labelPos.y}
              fill="#f4eeff"
              fontSize="13"
              fontWeight={800}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${midAngle}, ${labelPos.x}, ${labelPos.y})`}
            >
              {slot.icon}
            </text>
          </g>
        );
      }),
    []
  );

  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" />
      <div className="wheel-outer" style={{ width: size, height: size }}>
        <svg
          className="wheel-svg"
          viewBox="0 0 300 300"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {slices}
        </svg>
        <div className="wheel-center">🎰</div>
      </div>
    </div>
  );
});
