import React from 'react';

export function LoadingScreen({ label = 'جاري التحميل...' }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p style={{ color: 'var(--text-dim)' }}>{label}</p>
    </div>
  );
}

export function EmptyState({ icon = '🍀', title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className="toast">{message}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'نشطة',
    claim_requested: 'قيد المراجعة',
    approved: 'تم القبول',
    rejected: 'مرفوضة',
    expired: 'منتهية',
  };
  const cls: Record<string, string> = {
    active: 'status-active',
    claim_requested: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
    expired: 'status-expired',
  };
  return <span className={`status-badge ${cls[status] || ''}`}>{map[status] || status}</span>;
}
