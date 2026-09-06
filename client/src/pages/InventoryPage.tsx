import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../services/api';
import { InventoryItem } from '../types';
import { LoadingScreen, EmptyState, StatusBadge } from '../components/Common';
import { useCountdown } from '../hooks/useCountdown';
import { haptic, getTelegramWebApp } from '../hooks/useTelegramWebApp';

function ExpiryLabel({ expiresAt }: { expiresAt: string | null }) {
  const { label, isReady } = useCountdown(expiresAt);
  if (!expiresAt) return null;
  if (isReady) return <span style={{ color: 'var(--danger)', fontSize: 12 }}>انتهت الصلاحية</span>;
  return <span style={{ color: 'var(--accent-2)', fontSize: 12 }}>⏳ {label}</span>;
}

function TaskProgress({ task, onCopy, onShare }: {
  task: NonNullable<InventoryItem['task']>;
  onCopy: () => void;
  onShare: () => void;
}) {
  if (task.status === 'completed') {
    return (
      <div style={{ marginTop: 10, fontSize: 13, color: 'var(--accent-2)' }}>
        ✅ أكملت {task.creditedCount}/{task.requiredCount} دعوات — تكدر تستلم الجائزة الحين
      </div>
    );
  }
  if (task.status === 'expired') {
    return <div style={{ marginTop: 10, fontSize: 13, color: 'var(--danger)' }}>⌛ انتهت مهلة مهمة الدعوات</div>;
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
        🎯 ادعُ {task.requiredCount} أشخاص عن طريق رابطك الخاص بهذي الجائزة عشان تكدر تستلمها — {task.creditedCount}/{task.requiredCount}
      </div>
      {task.link && (
        <>
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--card-border)',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 12,
              wordBreak: 'break-all',
              marginBottom: 8,
              color: 'var(--text-dim)',
            }}
          >
            {task.link}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={onCopy}>
              📋 نسخ
            </button>
            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={onShare}>
              📤 مشاركة
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ ok: true; items: InventoryItem[] }>('/inventory');
    setItems(res.items);
  }

  useEffect(() => {
    load();
  }, []);

  function copyLink(link: string) {
    navigator.clipboard?.writeText(link).then(() => {
      setToast('تم نسخ الرابط ✅');
      haptic('light');
    });
  }

  function shareLink(link: string) {
    const tg = getTelegramWebApp();
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('انضم للبوت وجرب حظك 🎰')}`;
    tg?.openTelegramLink?.(shareUrl);
  }

  async function claim(item: InventoryItem) {
    setClaimingId(item.id);
    haptic('light');
    try {
      await api.post('/inventory/claim', { userPrizeId: item.id });
      setToast('تم إرسال طلب الاستلام، بانتظار المراجعة ⏳');
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EXPIRED') setToast('عذراً، انتهت صلاحية هذه الجائزة.');
        else if (err.code === 'ALREADY_REQUESTED') setToast('تم إرسال الطلب مسبقاً.');
        else if (err.code === 'REFERRALS_REQUIRED') setToast('لازم تكمل عدد الدعوات المطلوب أولاً.');
        else setToast('صار خطأ، حاول مرة ثانية.');
      } else {
        setToast('صار خطأ، حاول مرة ثانية.');
      }
    } finally {
      setClaimingId(null);
    }
  }

  if (!items) return <LoadingScreen />;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>🎒 المتجر / حقيبتي</h2>

      {items.length === 0 && (
        <EmptyState icon="🎒" title="حقيبتك فارغة حالياً" subtitle="روح للفرة المجانية ودور عشان تربح جوائز" />
      )}

      {items.map((item) => {
        const canClaim = item.status === 'active' && (!item.task || item.task.status === 'completed');
        return (
          <div className="card" key={item.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{item.prizeName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {item.source === 'referral' ? '🎁 مكافأة إحالة' : '🎰 من الفرة المجانية'}
                </div>
              </div>
              <StatusBadge status={item.status} />
            </div>

            {item.status === 'active' && item.task && (
              <TaskProgress
                task={item.task}
                onCopy={() => item.task?.link && copyLink(item.task.link)}
                onShare={() => item.task?.link && shareLink(item.task.link)}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <ExpiryLabel expiresAt={item.expiresAt} />
              {item.status === 'active' && canClaim && (
                <button
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '10px 22px' }}
                  disabled={claimingId === item.id}
                  onClick={() => claim(item)}
                >
                  {claimingId === item.id ? '...' : '📦 استلام'}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
