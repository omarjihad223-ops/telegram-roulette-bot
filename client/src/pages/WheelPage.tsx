import React, { useRef, useState } from 'react';
import { Wheel, WheelHandle } from '../components/Wheel';
import { findSlotIndexForKey } from '../components/wheelSlots';
import { useCountdown } from '../hooks/useCountdown';
import { api, ApiError } from '../services/api';
import { SpinResult, MeResponse } from '../types';
import { WinModal, BetterLuckModal } from '../components/ResultModals';
import { haptic } from '../hooks/useTelegramWebApp';

const SPIN_DURATION_MS = 12000;

export function WheelPage({ me, refreshMe }: { me: MeResponse; refreshMe: () => void }) {
  const wheelRef = useRef<WheelHandle>(null);
  const [nextSpinAt, setNextSpinAt] = useState(me.wheel.nextSpinAt);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpinResult | null>(null);
  const { label, isReady } = useCountdown(nextSpinAt);

  async function handleSpin() {
    if (spinning || !isReady) return;
    setError(null);
    setSpinning(true);
    haptic('medium');

    try {
      const res = await api.post<{ ok: true; result: SpinResult }>('/wheel/spin');
      const slotIndex = findSlotIndexForKey(res.result.won ? res.result.prizeKey : undefined);

      wheelRef.current?.spinTo(slotIndex, SPIN_DURATION_MS, () => {
        setSpinning(false);
        setResult(res.result);
        setNextSpinAt(res.result.nextSpinAt);
        haptic(res.result.won ? 'heavy' : 'light');
        refreshMe();
      });
    } catch (err) {
      setSpinning(false);
      if (err instanceof ApiError) {
        if (err.code === 'SPIN_COOLDOWN') setError('الفرة مو جاهزة بعد.');
        else if (err.code === 'FORCED_SUB_REQUIRED') setError('لازم تكمل الاشتراك الإجباري أولاً.');
        else if (err.code === 'CAPTCHA_REQUIRED') setError('لازم تكمل التحقق أولاً.');
        else setError('صار خطأ، حاول مرة ثانية.');
      } else {
        setError('صار خطأ، حاول مرة ثانية.');
      }
    }
  }

  return (
    <div>
      <div className="header-row">
        <h2 style={{ margin: 0 }}>🎰 الفرة المجانية</h2>
      </div>

      <Wheel ref={wheelRef} />

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        {!isReady && !spinning && (
          <div className="countdown" style={{ marginBottom: 14 }}>
            ⏳ الفرة القادمة بعد: {label}
          </div>
        )}
        <button className="btn btn-primary" disabled={spinning || !isReady} onClick={handleSpin}>
          {spinning ? '🎡 جاري الدوران...' : isReady ? '🚀 دور الحين' : '⏳ انتظر الفرة'}
        </button>
        {error && <p style={{ color: 'var(--danger)', marginTop: 10 }}>{error}</p>}
      </div>

      {result && result.won && (
        <WinModal prizeName={result.prizeName || ''} onClose={() => setResult(null)} />
      )}
      {result && !result.won && <BetterLuckModal onClose={() => setResult(null)} />}
    </div>
  );
}
