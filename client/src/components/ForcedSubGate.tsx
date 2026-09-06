import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { getTelegramWebApp } from '../hooks/useTelegramWebApp';
import { ForcedSubMissing } from '../types';

export function ForcedSubGate({ onPassed }: { onPassed: () => void }) {
  const [missing, setMissing] = useState<ForcedSubMissing[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const res = await api.get<{ ok: true; allOk: boolean; missing: ForcedSubMissing[] }>('/forced-sub/status');
      if (res.allOk) {
        onPassed();
      } else {
        setMissing(res.missing);
      }
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openChannel(url?: string) {
    if (!url) return;
    getTelegramWebApp()?.openTelegramLink?.(url);
  }

  if (loading) return <div className="app-content" style={{ paddingTop: 60 }}><p>...</p></div>;

  return (
    <div className="app-content" style={{ paddingTop: 40 }}>
      <div className="card">
        <div style={{ fontSize: 40, marginBottom: 10, textAlign: 'center' }}>📢</div>
        <h2 className="card-title" style={{ textAlign: 'center' }}>اشترك عشان تكمل</h2>
        <p className="card-sub" style={{ textAlign: 'center', marginBottom: 16 }}>
          لازم تشترك بالقنوات التالية قبل ما تكدر تستخدم البوت
        </p>

        {missing.map((chan) => (
          <div className="channel-row" key={chan.chatId}>
            <span style={{ fontWeight: 700 }}>{chan.title}</span>
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => openChannel(chan.inviteLink)}>
              فتح
            </button>
          </div>
        ))}

        <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={checking} onClick={check}>
          {checking ? '...جاري التحقق' : '✅ تحقق من الاشتراك'}
        </button>
      </div>
    </div>
  );
}
