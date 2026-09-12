import React, { useCallback, useEffect, useState } from 'react';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import { api } from './services/api';
import { MeResponse } from './types';
import { LoadingScreen } from './components/Common';
import { CaptchaGate } from './components/CaptchaGate';
import { ForcedSubGate } from './components/ForcedSubGate';
import { BottomNav, TabKey } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { WheelPage } from './pages/WheelPage';
import { TasksPage } from './pages/TasksPage';
import { InventoryPage } from './pages/InventoryPage';
import { HistoryPage } from './pages/HistoryPage';
import { AdminPage } from './pages/AdminPage';
import { StorePage } from './pages/StorePage';

type Stage = 'loading' | 'forced_sub' | 'captcha' | 'ready' | 'error';

export default function App() {
  const { ready: tgReady } = useTelegramWebApp();
  const [stage, setStage] = useState<Stage>('loading');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [tab, setTab] = useState<TabKey>('home');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const res = await api.get<MeResponse>('/me');
      setMe(res);
      if (!res.user.forcedSubOk) setStage('forced_sub');
      else if (!res.user.captchaPassed) setStage('captcha');
      else setStage('ready');
    } catch (err) {
      setErrorMsg('تعذر الاتصال بالخادم. تأكد إنك فاتح البوت من داخل تيليجرام.');
      setStage('error');
    }
  }, []);

  useEffect(() => {
    if (tgReady) loadMe();
  }, [tgReady, loadMe]);

  if (stage === 'loading' || !tgReady) return <LoadingScreen label="جاري التحضير..." />;

  if (stage === 'error') {
    return (
      <div className="app-content" style={{ paddingTop: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <p>{errorMsg}</p>
      </div>
    );
  }

  if (stage === 'forced_sub') {
    return <ForcedSubGate onPassed={loadMe} />;
  }

  if (stage === 'captcha') {
    return <CaptchaGate onPassed={loadMe} />;
  }

  if (!me) return <LoadingScreen />;

  if (showAdmin) return <AdminPage onClose={() => setShowAdmin(false)} />;

  return (
    <div className="app-shell">
      <div className="app-content">
        {me.isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
            <button
              className="pill pill-admin"
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => setShowAdmin(true)}
            >
              👨‍💻 لوحة المطور
            </button>
          </div>
        )}
        {tab === 'home' && <HomePage me={me} onNavigate={setTab} />}
        {tab === 'wheel' && <WheelPage me={me} refreshMe={loadMe} />}
        {tab === 'tasks' && <TasksPage />}
        {tab === 'inventory' && <InventoryPage />}
        {tab === 'history' && <HistoryPage />}
        {tab === 'store' && (
          <StorePage spinPoints={me.user.spinPoints} onBack={() => setTab('home')} refreshMe={loadMe} />
        )}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
