import React from 'react';
import { ReferralData } from '../types';
import { LoadingScreen } from '../components/Common';
import { api } from '../services/api';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { getTelegramWebApp } from '../hooks/useTelegramWebApp';

export function TasksPage() {
  const { data, error } = useCachedFetch<ReferralData>('referrals', () => api.get<ReferralData>('/referrals'));

  if (!data && error) return <LoadingScreen label="تعذر التحميل، حاول لاحقاً" />;
  if (!data) return <LoadingScreen />;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>🎯 المهام والإحالات</h2>

      <div className="card">
        <h3 className="card-title">🎁 دعوة الأصدقاء</h3>
        <p className="card-sub">
          كل جائزة تربحها من العجلة يكون معها رابط دعوة خاص فيها — تلقاه في حقيبتك. لازم تدعو
          العدد المطلوب من الأصدقاء (ويكملون الاشتراك الإجباري والتحقق) عشان تكدر تستلم تلك الجائزة
          بالذات. كل صديق يُحسب لجائزة واحدة فقط، ولازم يكون شخص حقيقي جديد على البوت.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <div className="pill" style={{ flex: 1, justifyContent: 'center' }}>✅ مؤهلة: {data.qualified}</div>
          <div className="pill" style={{ flex: 1, justifyContent: 'center' }}>⏳ قيد الانتظار: {data.pending}</div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">📋 شروط الإحالة</h3>
        <ul style={{ margin: 0, paddingRight: 18, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.9 }}>
          {data.rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {data.referrals.length > 0 && (
        <div className="card">
          <h3 className="card-title">👥 الأشخاص الي دعوتهم</h3>
          {data.referrals.map((r) => (
            <div
              key={r.id}
              className="list-item"
              style={{ cursor: r.invitee ? 'pointer' : 'default' }}
              onClick={() => {
                if (!r.invitee) return;
                if (r.invitee.profileLink.startsWith('https://t.me/')) {
                  getTelegramWebApp()?.openTelegramLink?.(r.invitee.profileLink);
                } else {
                  // No @username on file — best-effort open by numeric ID via Telegram's own URI scheme.
                  window.location.href = r.invitee.profileLink;
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {r.invitee?.photoUrl ? (
                  <img
                    src={r.invitee.photoUrl}
                    alt=""
                    style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'var(--accent-glow)',
                      color: '#1a0b2e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    {(r.invitee?.name || '؟').replace('@', '').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{r.invitee?.name || 'مستخدم محذوف'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {new Date(r.createdAt).toLocaleDateString('ar-EG')}
                  </div>
                </div>
              </div>
              <span className={`status-badge ${r.status === 'qualified' ? 'status-approved' : 'status-pending'}`}>
                {r.status === 'qualified' ? 'مؤهلة ✅' : 'قيد الانتظار ⏳'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
