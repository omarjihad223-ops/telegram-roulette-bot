import React from 'react';

export function WinModal({ prizeName, onClose }: { prizeName: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="confetti-emoji">🎉</div>
        <h2 style={{ margin: '12px 0 6px', fontSize: 22 }}>مبروك!</h2>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-glow)', margin: '0 0 20px' }}>
          {prizeName}
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 20 }}>
          تقدر تستلمها الآن من المتجر 🎒 خلال 24 ساعة قبل ما تنتهي.
        </p>
        <button className="btn btn-primary" onClick={onClose}>تم</button>
      </div>
    </div>
  );
}

export function BetterLuckModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="confetti-emoji">🍀</div>
        <h2 style={{ margin: '12px 0 6px', fontSize: 22 }}>حظ أوفر 🍀</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>
          جرب حظك مرة ثانية بعد ما تجي الفرة المجانية القادمة.
        </p>
        <button className="btn btn-primary" onClick={onClose}>رجوع</button>
      </div>
    </div>
  );
}
