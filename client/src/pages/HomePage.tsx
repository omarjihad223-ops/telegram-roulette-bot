import React from 'react';
import { MeResponse } from '../types';
import { useCountdown } from '../hooks/useCountdown';
import { TabKey } from '../components/BottomNav';

export function HomePage({ me, onNavigate }: { me: MeResponse; onNavigate: (t: TabKey) => void }) {
  const { label, isReady } = useCountdown(me.wheel.nextSpinAt);
  const initial = (me.user.firstName || me.user.username || '؟').charAt(0).toUpperCase();

  return (
    <div>
      <div className="header-row">
        <div className="user-badge">
          {me.user.photoUrl ? (
            <img
              src={me.user.photoUrl}
              alt=""
              className="avatar-circle"
              style={{ objectFit: 'cover' }}
              onError={(e) => {
                // Telegram photo URLs occasionally 403/expire — fall back to the initial letter.
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('avatar-fallback-hidden');
              }}
            />
          ) : null}
          <div className={`avatar-circle ${me.user.photoUrl ? 'avatar-fallback-hidden' : ''}`}>{initial}</div>
          <div>
            <div style={{ fontWeight: 800 }}>{me.user.firstName || me.user.username || 'صديقنا'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>مرحباً بك 👋</div>
          </div>
        </div>
        <div className="pill">🎰 {me.user.totalSpins}</div>
      </div>

      <div className="card" onClick={() => onNavigate('wheel')} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title">🎰 الفرة المجانية</h2>
            <p className="card-sub">دور كل يوم واربح جوائز</p>
          </div>
          <div style={{ fontSize: 40 }}>🎡</div>
        </div>
        <div style={{ marginTop: 14 }}>
          {isReady ? (
            <span className="pill" style={{ background: 'rgba(55,224,138,0.15)', color: 'var(--success)' }}>
              ✅ الفرة جاهزة الآن
            </span>
          ) : (
            <span className="countdown">⏳ متبقي: {label}</span>
          )}
        </div>
      </div>

      <div className="card" onClick={() => onNavigate('tasks')} style={{ cursor: 'pointer' }}>
        <h2 className="card-title">🎯 المهام والإحالات</h2>
        <p className="card-sub">ادعُ أصدقاءك واحصل على مكافآت إضافية (اختياري بالكامل)</p>
      </div>

      <div className="card" onClick={() => onNavigate('inventory')} style={{ cursor: 'pointer' }}>
        <h2 className="card-title">🎒 المتجر / حقيبتي</h2>
        <p className="card-sub">شوف جوائزك واستلمها قبل ما تنتهي</p>
      </div>
    </div>
  );
}
