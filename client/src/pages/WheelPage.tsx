import React, { useEffect, useRef, useState } from 'react';
import { Wheel, WheelHandle } from '../components/Wheel';
import { buildWheelSlots, findSlotIndexForKey, PublicPrize } from '../components/wheelSlots';
import { useCountdown } from '../hooks/useCountdown';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { api, ApiError } from '../services/api';
import { SpinResult, MeResponse } from '../types';
import { WinModal, BetterLuckModal } from '../components/ResultModals';
import { LoadingScreen } from '../components/Common';
import { haptic } from '../hooks/useTelegramWebApp';

const SPIN_DURATION_MS = 12000;

export function WheelPage({ me, refreshMe }: { me: MeResponse; refreshMe: () => void }) {
  const wheelRef = useRef<WheelHandle>(null);
  const [nextSpinAt, setNextSpinAt] = useState(me.wheel.nextSpinAt);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpinResult | null>(null);
  const { label, isReady } = useCountdown(nextSpinAt);

  // If the animation from a PREVIOUS spin got interrupted (the user navigated away from
  // this tab before the 12s animation finished playing), the client never got to record
  // that spin's result or update the cooldown — the server already committed it, but this
  // page's local state never heard about it. Refreshing from the server every time this
  // page opens means that stale state can never persist past a single tab revisit, no
  // matter what happened on a previous visit.
  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refreshMe() above updates the app-level `me` asynchronously — this keeps the local
  // cooldown state in sync with it once the fresh response arrives, instead of only ever
  // reflecting whatever `me` looked like at the exact moment this page first mounted.
  useEffect(() => {
    setNextSpinAt(me.wheel.nextSpinAt);
  }, [me.wheel.nextSpinAt]);

  // The exact same prize list (keys, names, icons/images) the server draws the spin
  // result from — the wheel is built from this, never a separate hardcoded copy, so it
  // can never visually show a prize/key that doesn't match what was actually won.
  const { data: prizes } = useCachedFetch<PublicPrize[]>('wheel-prizes', async () => {
    const res = await api.get<{ ok: true; prizes: PublicPrize[] }>('/wheel/prizes');
    return res.prizes;
  });
  const slots = prizes ? buildWheelSlots(prizes) : [];

  // Rest the wheel on the true last result from the very first render — see the comment
  // on Wheel's initialLanding prop for why this matters.
  const initialLanding =
    slots.length > 0 && me.wheel.lastSpin
      ? {
          slotIndex: findSlotIndexForKey(slots, me.wheel.lastSpin.won ? me.wheel.lastSpin.prizeKey ?? undefined : undefined),
          content: me.wheel.lastSpin.won
            ? {
                icon: me.wheel.lastSpin.prizeIcon || '🎁',
                imageUrl: me.wheel.lastSpin.prizeImageUrl,
                label: me.wheel.lastSpin.prizeName || '',
                key: me.wheel.lastSpin.prizeKey ?? undefined,
              }
            : { icon: '🍀', imageUrl: null, label: 'حظ أوفر' },
        }
      : null;

  async function handleSpin() {
    if (spinning || !isReady || slots.length === 0) return;
    setError(null);
    setSpinning(true);
    haptic('medium');

    try {
      const res = await api.post<{ ok: true; result: SpinResult }>('/wheel/spin');
      const slotIndex = findSlotIndexForKey(slots, res.result.won ? res.result.prizeKey : undefined);
      const landingOverride = res.result.won
        ? { icon: res.result.prizeIcon || '🎁', imageUrl: res.result.prizeImageUrl ?? null, label: res.result.prizeName || '', key: res.result.prizeKey }
        : { icon: '🍀', imageUrl: null, label: 'حظ أوفر', key: undefined };

      wheelRef.current?.spinTo(
        slotIndex,
        SPIN_DURATION_MS,
        () => {
          setSpinning(false);
          setResult(res.result);
          setNextSpinAt(res.result.nextSpinAt);
          haptic(res.result.won ? 'heavy' : 'light');
          refreshMe();
        },
        landingOverride
      );
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

      {slots.length === 0 ? (
        <LoadingScreen />
      ) : (
        <div className={spinning ? 'reel-pending-pulse' : undefined}>
          <Wheel ref={wheelRef} slots={slots} initialLanding={initialLanding} />
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        {!isReady && !spinning && (
          <>
            <div className="countdown" style={{ marginBottom: 14 }}>
              ⏳ الفرة القادمة بعد: {label}
            </div>
            {/* The reel's visual position has no memory of a past spin once this page
                remounts — this text is the only thing that reliably shows what you actually
                won last time. */}
            {me.wheel.lastSpin && (
              <div
                className="card"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12, marginBottom: 14 }}
              >
                {me.wheel.lastSpin.won ? (
                  <>
                    {me.wheel.lastSpin.prizeImageUrl ? (
                      <img
                        src={me.wheel.lastSpin.prizeImageUrl}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 24 }}>{me.wheel.lastSpin.prizeIcon || '🎁'}</span>
                    )}
                    <span style={{ fontSize: 14 }}>
                      آخر نتيجة: ربحت <b>{me.wheel.lastSpin.prizeName}</b>
                      {me.wheel.lastSpin.prizeKey && (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.7 }}> ({me.wheel.lastSpin.prizeKey})</span>
                      )}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 14 }}>🍀 آخر نتيجة: حظ أوفر بالمرة الجاية</span>
                )}
              </div>
            )}
          </>
        )}
        <button className="btn btn-primary" disabled={spinning || !isReady || slots.length === 0} onClick={handleSpin}>
          {spinning ? '🎡 جاري الدوران...' : isReady ? '🚀 دور الحين' : '⏳ انتظر الفرة'}
        </button>
        {error && <p style={{ color: 'var(--danger)', marginTop: 10 }}>{error}</p>}
      </div>

      {/* Full, always-visible list of every prize currently on the wheel — the reel strip
          only shows a few cards at a time as it scrolls, so this is how a player can browse
          and confirm every prize (all of them) without waiting for a lucky spin. */}
      {prizes && prizes.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 className="card-title" style={{ marginBottom: 10 }}>
            🏆 كل الجوائز المتاحة ({prizes.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {prizes.map((p) => (
              <div
                key={p.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 6px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--card-border)',
                }}
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: 26 }}>{p.icon}</div>
                )}
                <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--text-dim)' }}>{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && result.won && (
        <WinModal prizeName={result.prizeName || ''} prizeKey={result.prizeKey} onClose={() => setResult(null)} />
      )}
      {result && !result.won && <BetterLuckModal onClose={() => setResult(null)} />}
    </div>
  );
}
