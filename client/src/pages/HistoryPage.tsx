import React, { useEffect } from 'react';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { LoadingScreen, EmptyState } from '../components/Common';
import { useCachedFetch } from '../hooks/useCachedFetch';

const ICONS: Record<string, string> = {
  prize_won: '🎁',
  prize_expiring: '⚠️',
  claim_pending: '⏳',
  claim_approved: '✅',
  claim_rejected: '❌',
  wheel_ready: '🎰',
  referral_progress: '👥',
  referral_reward: '🎉',
  system_announcement: '📢',
};

export function HistoryPage() {
  const { data: items, error } = useCachedFetch<NotificationItem[]>('notifications', async () => {
    const res = await api.get<{ ok: true; items: NotificationItem[] }>('/notifications');
    return res.items;
  });

  useEffect(() => {
    api.post('/notifications/read').catch(() => {});
  }, []);

  if (!items && error) return <LoadingScreen label="تعذر التحميل، حاول لاحقاً" />;
  if (!items) return <LoadingScreen />;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>📜 السجل</h2>

      {items.length === 0 && <EmptyState icon="🔔" title="ما فيه أي نشاط بعد" />}

      {items.map((n) => (
        <div className="list-item" key={n._id} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontWeight: 800 }}>
              {ICONS[n.type] || '🔔'} {n.title}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {new Date(n.createdAt).toLocaleString('ar-EG')}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', whiteSpace: 'pre-line' }}>{n.body}</p>
        </div>
      ))}
    </div>
  );
}
