import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ReferralData } from '../types';
import { LoadingScreen } from '../components/Common';

export function TasksPage() {
  const [data, setData] = useState<ReferralData | null>(null);

  useEffect(() => {
    api.get<ReferralData>('/referrals').then(setData).catch(() => setData(null));
  }, []);

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
          <h3 className="card-title">👥 إحالاتي</h3>
          {data.referrals.map((r) => (
            <div className="list-item" key={r.id}>
              <span>{new Date(r.createdAt).toLocaleDateString('ar-EG')}</span>
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
