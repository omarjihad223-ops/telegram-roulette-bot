import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../services/api';
import { LoadingScreen } from '../components/Common';
import { MeResponse } from '../types';

interface AdminPrize {
  key: string;
  name: string;
  icon: string;
  baseWeight: number;
  stock: number;
  isUnlimited: boolean;
  isActive: boolean;
  deliveredCount: number;
  pendingCount: number;
}

interface Withdrawal {
  _id: string;
  telegramId: number;
  username?: string;
  prizeNameSnapshot: string;
  requestedAt: string;
}

type AdminTab = 'prizes' | 'withdrawals' | 'forcedChats' | 'bans' | 'developers' | 'settings';

export function AdminPage({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<AdminTab>('prizes');

  return (
    <div className="app-content" style={{ paddingBottom: 100 }}>
      <div className="header-row">
        <h2 style={{ margin: 0 }}>👨‍💻 لوحة المطور</h2>
        <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={onClose}>
          إغلاق ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['prizes', 'withdrawals', 'forcedChats', 'bans', 'developers', 'settings'] as AdminTab[]).map((t) => (
          <button
            key={t}
            className={`pill`}
            style={{ flex: 1, minWidth: 90, justifyContent: 'center', background: tab === t ? 'var(--accent)' : undefined, cursor: 'pointer', border: 'none' }}
            onClick={() => setTab(t)}
          >
            {t === 'prizes'
              ? '🎁 الجوائز'
              : t === 'withdrawals'
              ? '📋 الطلبات'
              : t === 'forcedChats'
              ? '📢 الاشتراك الإجباري'
              : t === 'bans'
              ? '🚫 الحظر'
              : t === 'developers'
              ? '👥 المطورين'
              : '⚙️ الإعدادات'}
          </button>
        ))}
      </div>

      {tab === 'prizes' && <PrizesTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'forcedChats' && <ForcedChatsTab />}
      {tab === 'bans' && <BansTab />}
      {tab === 'developers' && <DevelopersTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

interface ForcedChat {
  chatId: string;
  title?: string;
  type: 'channel' | 'group' | 'unknown';
  inviteLink?: string;
  isActive: boolean;
}

function ForcedChatsTab() {
  const [chats, setChats] = useState<ForcedChat[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ ok: true; chats: ForcedChat[] }>('/admin/forced-chats');
    setChats(res.chats);
  }

  useEffect(() => {
    load();
  }, []);

  async function addChat() {
    const input = window.prompt('أدخل @يوزرنيم القناة/الكروب، أو رابط تيليجرام، أو الـID:\n\n⚠️ يجب أن يكون البوت أدمن بها أولاً.');
    if (!input) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/forced-chats', { input });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'صار خطأ، حاول مرة ثانية.');
    } finally {
      setBusy(false);
    }
  }

  async function removeChat(chatId: string) {
    if (!window.confirm('متأكد تريد حذف هذي القناة/الكروب من الاشتراك الإجباري؟')) return;
    setBusy(true);
    setError(null);
    try {
      await api.del(`/admin/forced-chats/${encodeURIComponent(chatId)}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'صار خطأ، حاول مرة ثانية.');
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    if (!window.confirm('متأكد تريد حذف كل القنوات والكروبات من الاشتراك الإجباري؟')) return;
    setBusy(true);
    try {
      await api.post('/admin/forced-chats/clear', {});
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!chats) return <LoadingScreen />;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn btn-primary" disabled={busy} onClick={addChat}>
          ➕ إضافة قناة/كروب
        </button>
        {chats.length > 0 && (
          <button className="btn btn-secondary" disabled={busy} onClick={clearAll}>
            🗑 مسح الكل
          </button>
        )}
      </div>
      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}
      {chats.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-dim)' }}>ماكو قنوات/كروبات مضافة</p>}
      {chats.map((c) => (
        <div className="card" key={c.chatId}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800 }}>{c.title || c.chatId}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {c.type === 'channel' ? '📢 قناة' : c.type === 'group' ? '👥 كروب' : '❓ غير معروف'} · {c.chatId}
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '8px 14px' }}
              disabled={busy}
              onClick={() => removeChat(c.chatId)}
            >
              🗑️ حذف
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface BannedUser {
  telegramId: number;
  username?: string;
  banReason?: string;
}

function BansTab() {
  const [users, setUsers] = useState<BannedUser[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ ok: true; users: BannedUser[] }>('/admin/bans');
    setUsers(res.users);
  }

  useEffect(() => {
    load();
  }, []);

  async function banSomeone() {
    const lookup = window.prompt('أدخل @يوزرنيم أو الأيدي الرقمي للشخص المراد حظره:');
    if (!lookup) return;
    const reason = window.prompt('سبب الحظر (اختياري):') || undefined;
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/bans', { lookup, reason });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'صار خطأ، حاول مرة ثانية.');
    } finally {
      setBusy(false);
    }
  }

  async function unban(telegramId: number) {
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/bans/unban', { lookup: String(telegramId) });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'صار خطأ، حاول مرة ثانية.');
    } finally {
      setBusy(false);
    }
  }

  async function unbanAll() {
    if (!window.confirm('متأكد تريد فك الحظر عن الجميع؟')) return;
    setBusy(true);
    try {
      await api.post('/admin/bans/unban-all', {});
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!users) return <LoadingScreen />;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn btn-primary" disabled={busy} onClick={banSomeone}>
          🚫 حظر شخص
        </button>
        {users.length > 0 && (
          <button className="btn btn-secondary" disabled={busy} onClick={unbanAll}>
            ✅ فك حظر الجميع
          </button>
        )}
      </div>
      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}
      {users.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-dim)' }}>ماكو أي شخص محظور 🎉</p>}
      {users.map((u) => (
        <div className="card" key={u.telegramId}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800 }}>{u.username ? '@' + u.username : `ID: ${u.telegramId}`}</div>
              {u.banReason && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>السبب: {u.banReason}</div>}
            </div>
            <button
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '8px 14px' }}
              disabled={busy}
              onClick={() => unban(u.telegramId)}
            >
              ✅ فك الحظر
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface Developer {
  telegramId: number;
  username?: string;
  role: 'owner' | 'developer';
  createdAt: string | null;
}

function DevelopersTab() {
  const [devs, setDevs] = useState<Developer[] | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [devsRes, meRes] = await Promise.all([
      api.get<{ ok: true; developers: Developer[] }>('/admin/developers'),
      api.get<MeResponse>('/me'),
    ]);
    setDevs(devsRes.developers);
    setIsOwner(meRes.adminRole === 'owner');
  }

  useEffect(() => {
    load();
  }, []);

  async function addDeveloper() {
    const lookup = window.prompt('أدخل @يوزرنيم أو الأيدي الرقمي للمطور الجديد:');
    if (!lookup) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/developers', { lookup });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'صار خطأ، حاول مرة ثانية.');
    } finally {
      setBusy(false);
    }
  }

  async function removeDeveloper(telegramId: number) {
    if (!window.confirm('متأكد تريد تحذف هذا المطور؟')) return;
    setBusy(true);
    setError(null);
    try {
      await api.del(`/admin/developers/${telegramId}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'صار خطأ، حاول مرة ثانية.');
    } finally {
      setBusy(false);
    }
  }

  if (!devs) return <LoadingScreen />;

  return (
    <div>
      {isOwner && (
        <button className="btn btn-primary" style={{ marginBottom: 12 }} disabled={busy} onClick={addDeveloper}>
          ➕ إضافة مطور
        </button>
      )}
      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}
      {devs.map((d) => (
        <div className="card" key={d.telegramId}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800 }}>{d.username ? '@' + d.username : `ID: ${d.telegramId}`}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {d.role === 'owner' ? '👑 المالك' : '🛠️ مطور'} · ID: {d.telegramId}
                {d.createdAt ? ` · انضم بتاريخ ${new Date(d.createdAt).toLocaleDateString('ar-EG')}` : ''}
              </div>
            </div>
            {isOwner && d.role !== 'owner' && (
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '8px 14px' }}
                disabled={busy}
                onClick={() => removeDeveloper(d.telegramId)}
              >
                🗑️ حذف
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrizesTab() {
  const [prizes, setPrizes] = useState<AdminPrize[] | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ key: '', name: '', icon: '', baseWeight: '', stock: '', isUnlimited: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  async function load() {
    const res = await api.get<{ ok: true; prizes: AdminPrize[] }>('/admin/prizes');
    setPrizes(res.prizes);
  }

  useEffect(() => {
    load();
  }, []);

  async function adjustStock(key: string, action: 'add' | 'remove') {
    const amountStr = window.prompt(action === 'add' ? 'كم تريد أن تضيف؟' : 'كم تريد أن تنقص؟');
    const amount = Number(amountStr);
    if (!amount || amount <= 0) return;
    setBusyKey(key);
    try {
      await api.post(`/admin/prizes/${key}/stock/${action}`, { amount });
      await load();
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleActive(prize: AdminPrize) {
    setBusyKey(prize.key);
    try {
      await api.post(`/admin/prizes/${prize.key}/active`, { isActive: !prize.isActive });
      await load();
    } finally {
      setBusyKey(null);
    }
  }

  async function submitNewPrize(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const baseWeight = Number(form.baseWeight);
    const stock = Number(form.stock);
    if (!form.key.trim() || !form.name.trim()) {
      setFormError('الاسم والمفتاح مطلوبين.');
      return;
    }
    if (!Number.isFinite(baseWeight) || baseWeight < 0) {
      setFormError('النسبة (baseWeight) لازم رقم صحيح.');
      return;
    }
    if (!form.isUnlimited && (!Number.isFinite(stock) || stock < 0)) {
      setFormError('المخزون لازم رقم صحيح، أو فعّل "مخزون لا نهائي".');
      return;
    }
    if (form.icon && prizes?.some((p) => p.icon === form.icon)) {
      const proceed = window.confirm('هذا الإيموجي مستخدم بجائزة ثانية مسبقاً. تريد تكمل بنفس الإيموجي؟');
      if (!proceed) return;
    }

    setFormBusy(true);
    try {
      await api.post('/admin/prizes', {
        key: form.key.trim(),
        name: form.name.trim(),
        icon: form.icon.trim() || '🎁',
        baseWeight,
        stock: form.isUnlimited ? 0 : stock,
        isUnlimited: form.isUnlimited,
      });
      setForm({ key: '', name: '', icon: '', baseWeight: '', stock: '', isUnlimited: false });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'صار خطأ، حاول مرة ثانية.');
    } finally {
      setFormBusy(false);
    }
  }

  if (!prizes) return <LoadingScreen />;

  const usedIcons = new Map<string, number>();
  prizes.forEach((p) => usedIcons.set(p.icon, (usedIcons.get(p.icon) ?? 0) + 1));

  return (
    <div>
      <button className="btn btn-primary" style={{ marginBottom: 12 }} onClick={() => setShowForm((s) => !s)}>
        {showForm ? '✕ إلغاء' : '➕ إضافة جائزة جديدة'}
      </button>

      {showForm && (
        <form className="card" onSubmit={submitNewPrize}>
          <div style={{ display: 'grid', gap: 10 }}>
            <input
              placeholder="المفتاح (key) — إنجليزي، مثل gems_3000"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="اسم الجائزة (بدون إيموجي) — مثل 3000 جوهرة"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="الإيموجي — مثل 💎"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="النسبة الداخلية (baseWeight) — مثل 30"
              value={form.baseWeight}
              onChange={(e) => setForm({ ...form, baseWeight: e.target.value })}
              style={inputStyle}
              inputMode="decimal"
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.isUnlimited}
                onChange={(e) => setForm({ ...form, isUnlimited: e.target.checked })}
              />
              مخزون لا نهائي
            </label>
            {!form.isUnlimited && (
              <input
                placeholder="المخزون الابتدائي"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                style={inputStyle}
                inputMode="numeric"
              />
            )}
            {formError && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{formError}</div>}
            <button className="btn btn-primary" disabled={formBusy} type="submit">
              {formBusy ? '...' : '✅ إنشاء الجائزة'}
            </button>
          </div>
        </form>
      )}

      {prizes.map((p) => (
        <div className="card" key={p.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{ fontSize: 22, cursor: 'pointer' }}
                title="اضغط لتغيير الإيموجي"
                onClick={() => editPrizeIcon(p, load, setBusyKey)}
              >
                {p.icon}
              </span>
              {p.name}
              {usedIcons.get(p.icon)! > 1 && (
                <span style={{ fontSize: 11, color: 'var(--danger)' }} title="هذا الإيموجي مكرر بجائزة ثانية">
                  ⚠️ مكرر
                </span>
              )}
            </div>
            <span className={`status-badge ${p.isActive ? 'status-active' : 'status-expired'}`}>
              {p.isActive ? 'مفعّلة' : 'موقوفة'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', margin: '8px 0' }}>
            المخزون: {p.isUnlimited ? '∞' : p.stock} | مُسلَّم: {p.deliveredCount} | قيد التحضير: {p.pendingCount} | النسبة: {p.baseWeight}
          </div>
          {!p.isUnlimited && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" disabled={busyKey === p.key} onClick={() => adjustStock(p.key, 'add')}>
                ➕ إضافة
              </button>
              <button className="btn btn-secondary" disabled={busyKey === p.key} onClick={() => adjustStock(p.key, 'remove')}>
                ➖ إنقاص
              </button>
            </div>
          )}
          <button
            className="btn btn-secondary"
            style={{ marginTop: 8 }}
            disabled={busyKey === p.key}
            onClick={() => toggleActive(p)}
          >
            {p.isActive ? '⏸ إيقاف الجائزة' : '▶️ تفعيل الجائزة'}
          </button>
        </div>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--card-border)',
  borderRadius: 10,
  padding: '10px 12px',
  color: 'inherit',
  fontSize: 14,
};

async function editPrizeIcon(
  prize: AdminPrize,
  reload: () => Promise<void>,
  setBusyKey: (k: string | null) => void
) {
  const icon = window.prompt('اكتب الإيموجي الجديد لهذي الجائزة (سطر واحد فقط):', prize.icon);
  if (!icon || !icon.trim()) return;
  setBusyKey(prize.key);
  try {
    await api.patch(`/admin/prizes/${prize.key}`, { icon: icon.trim() });
  } finally {
    setBusyKey(null);
  }
  await reload();
}

function WithdrawalsTab() {
  const [items, setItems] = useState<Withdrawal[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ ok: true; items: Withdrawal[] }>('/admin/withdrawals');
    setItems(res.items);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await api.post(`/admin/withdrawals/${id}/approve`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt('اكتب سبب الرفض:');
    if (!reason) return;
    setBusyId(id);
    try {
      await api.post(`/admin/withdrawals/${id}/reject`, { reason });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (!items) return <LoadingScreen />;
  if (items.length === 0) return <p style={{ textAlign: 'center', color: 'var(--text-dim)' }}>لا توجد طلبات معلقة 🎉</p>;

  return (
    <div>
      {items.map((w) => (
        <div className="card" key={w._id}>
          <div style={{ fontWeight: 800 }}>{w.prizeNameSnapshot}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', margin: '6px 0' }}>
            {w.username ? '@' + w.username : '-'} | ID: {w.telegramId}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" disabled={busyId === w._id} onClick={() => approve(w._id)}>
              ✅ قبول
            </button>
            <button className="btn btn-secondary" disabled={busyId === w._id} onClick={() => reject(w._id)}>
              ❌ رفض
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<{ maintenanceMode: boolean } | null>(null);

  async function load() {
    const res = await api.get<{ ok: true; settings: { maintenanceMode: boolean } }>('/admin/settings');
    setSettings(res.settings);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleMaintenance() {
    if (!settings) return;
    await api.post('/admin/settings/maintenance', { enabled: !settings.maintenanceMode });
    await load();
  }

  if (!settings) return <LoadingScreen />;

  return (
    <div className="card">
      <h3 className="card-title">🔧 وضع الصيانة</h3>
      <p className="card-sub">عند التفعيل، يمنع المستخدمون العاديون من استخدام البوت.</p>
      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={toggleMaintenance}>
        {settings.maintenanceMode ? 'إيقاف وضع الصيانة' : 'تفعيل وضع الصيانة'}
      </button>
    </div>
  );
}
