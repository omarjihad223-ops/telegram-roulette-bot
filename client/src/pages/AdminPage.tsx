import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../services/api';
import { LoadingScreen } from '../components/Common';
import { MeResponse } from '../types';

interface AdminPrize {
  key: string;
  name: string;
  icon: string;
  imageUrl?: string | null;
  storePrice?: number | null;
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

type AdminTab = 'prizes' | 'withdrawals' | 'forcedChats' | 'bans' | 'developers' | 'broadcast' | 'stats' | 'settings';

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
        {(['prizes', 'withdrawals', 'forcedChats', 'bans', 'developers', 'broadcast', 'stats', 'settings'] as AdminTab[]).map((t) => (
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
              : t === 'broadcast'
              ? '📣 الإذاعة'
              : t === 'stats'
              ? '📊 الإحصائيات'
              : '⚙️ الإعدادات'}
          </button>
        ))}
      </div>

      {tab === 'prizes' && <PrizesTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'forcedChats' && <ForcedChatsTab />}
      {tab === 'bans' && <BansTab />}
      {tab === 'developers' && <DevelopersTab />}
      {tab === 'broadcast' && <BroadcastTab />}
      {tab === 'stats' && <StatsTab />}
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

// Mirrors server/src/workers/seed.ts — the 15 standard prizes already used by the wheel.
// Picking one here just autofills the form; nothing is created until "إنشاء الجائزة" is
// pressed, and any field can still be edited by hand afterward.
const PRESET_PRIZES = [
  { key: 'gems_3000', name: 'حساب 3000 جوهرة', icon: '💎', baseWeight: '30', stock: '1000' },
  { key: 'stars_15', name: '15 نجمة', icon: '⭐', baseWeight: '30', stock: '1000' },
  { key: 'asia_credit_1', name: 'رصيد آسيا 1', icon: '📱', baseWeight: '24.8993', stock: '500' },
  { key: 'gems_5000', name: '5000 جوهرة', icon: '💎', baseWeight: '9', stock: '500' },
  { key: 'stars_25', name: '25 نجمة', icon: '⭐', baseWeight: '5.9', stock: '500' },
  { key: 'asia_credit_5', name: 'رصيد آسيا 5', icon: '📱', baseWeight: '0.1', stock: '50' },
  { key: 'extreme_account_20', name: 'حساب 20 Extreme', icon: '⚡', baseWeight: '0.0001', stock: '2' },
  { key: 'asia_credit_300', name: 'رصيد آسيا 300', icon: '📱', baseWeight: '0.0001', stock: '2' },
  { key: 'asia_credit_140', name: 'رصيد آسيا 140', icon: '📱', baseWeight: '0.0005', stock: '3' },
  { key: 'nft_normal', name: 'NFT عادي', icon: '🎁', baseWeight: '0.01', stock: '10' },
  { key: 'stars_200', name: '200 نجمة', icon: '⭐', baseWeight: '0.05', stock: '20' },
  { key: 'stars_400', name: '400 نجمة', icon: '⭐', baseWeight: '0.01', stock: '10' },
  { key: 'stars_1000', name: '1000 نجمة', icon: '⭐', baseWeight: '0.005', stock: '5' },
  { key: 'gems_7000', name: '7000 جوهرة', icon: '💎', baseWeight: '0.005', stock: '5' },
  { key: 'nft_black', name: 'NFT Black', icon: '🖤', baseWeight: '0.01', stock: '5' },
];

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

  async function uploadImage(key: string, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      window.alert('حجم الصورة أكبر من 5 ميغابايت. اختر صورة أصغر.');
      return;
    }
    setBusyKey(key);
    try {
      await api.upload(`/admin/prizes/${key}/image`, file);
      await load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'فشل رفع الصورة، حاول مرة ثانية.');
    } finally {
      setBusyKey(null);
    }
  }

  async function clearImage(key: string) {
    setBusyKey(key);
    try {
      await api.del(`/admin/prizes/${key}/image`);
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
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', marginBottom: 6 }}>
                🎁 اختر جائزة جاهزة (يعبي الاسم والإيموجي والنسبة تلقائياً) — أو اتركها فارغة وسوي جائزة مخصصة
              </label>
              <select
                style={inputStyle}
                defaultValue=""
                onChange={(e) => {
                  const preset = PRESET_PRIZES.find((p) => p.key === e.target.value);
                  if (preset) {
                    setForm({ ...form, ...preset, isUnlimited: false });
                  }
                }}
              >
                <option value="">— جائزة مخصصة (أدخل كل شي يدوياً) —</option>
                {PRESET_PRIZES.map((p) => (
                  <option key={p.key} value={p.key} disabled={prizes?.some((existing) => existing.key === p.key)}>
                    {p.icon} {p.name}
                    {prizes?.some((existing) => existing.key === p.key) ? ' (موجودة مسبقاً)' : ''}
                  </option>
                ))}
              </select>
            </div>
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
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt=""
                  style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
                />
              ) : (
                <span
                  style={{ fontSize: 22, cursor: 'pointer' }}
                  title="اضغط لتغيير الإيموجي"
                  onClick={() => editPrizeIcon(p, load, setBusyKey)}
                >
                  {p.icon}
                </span>
              )}
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <label className="btn btn-secondary" style={{ cursor: busyKey === p.key ? 'default' : 'pointer', opacity: busyKey === p.key ? 0.6 : 1 }}>
              📷 {p.imageUrl ? 'تغيير الصورة' : 'إضافة صورة'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                disabled={busyKey === p.key}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = ''; // allow re-selecting the same file next time
                  if (file) uploadImage(p.key, file);
                }}
              />
            </label>
            {p.imageUrl && (
              <button className="btn btn-secondary" disabled={busyKey === p.key} onClick={() => clearImage(p.key)}>
                🗑 حذف الصورة
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 13,
                padding: '4px 10px',
                borderRadius: 8,
                background: p.storePrice ? 'rgba(213,155,255,0.15)' : 'rgba(255,255,255,0.06)',
                color: p.storePrice ? 'var(--accent-glow)' : 'var(--text-dim)',
              }}
            >
              {p.storePrice ? `🏪 بالمتجر: ${p.storePrice} فرة` : '🏪 مو موجودة بالمتجر'}
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 12 }}
              disabled={busyKey === p.key}
              onClick={() => editStorePrice(p, load, setBusyKey)}
            >
              {p.storePrice ? '✏️ تعديل السعر' : '➕ أضفها للمتجر'}
            </button>
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

async function editStorePrice(
  prize: AdminPrize,
  reload: () => Promise<void>,
  setBusyKey: (k: string | null) => void
) {
  const raw = window.prompt(
    'سعر هذي الجائزة بالمتجر (بعدد الفرات) — اترك الخانة فارغة عشان تشيلها من المتجر:',
    prize.storePrice ? String(prize.storePrice) : ''
  );
  if (raw === null) return; // cancelled
  const trimmed = raw.trim();
  const storePrice = trimmed === '' ? null : Number(trimmed);
  if (storePrice !== null && (!Number.isFinite(storePrice) || storePrice <= 0)) {
    window.alert('السعر لازم يكون رقم موجب.');
    return;
  }
  setBusyKey(prize.key);
  try {
    await api.post(`/admin/prizes/${prize.key}/store-price`, { storePrice });
  } catch (err) {
    window.alert(err instanceof ApiError ? err.message : 'فشل تحديث السعر');
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
  const [settings, setSettings] = useState<{ maintenanceMode: boolean; shareImageUrl?: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api.get<{ ok: true; settings: { maintenanceMode: boolean; shareImageUrl?: string | null } }>(
      '/admin/settings'
    );
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

  async function uploadShareImage(file: File) {
    setBusy(true);
    try {
      await api.upload('/admin/settings/share-image', file);
      await load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'فشل رفع الصورة');
    } finally {
      setBusy(false);
    }
  }

  async function clearShareImage() {
    setBusy(true);
    try {
      await api.del('/admin/settings/share-image');
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return <LoadingScreen />;

  return (
    <>
      <div className="card">
        <h3 className="card-title">🔧 وضع الصيانة</h3>
        <p className="card-sub">عند التفعيل، يمنع المستخدمون العاديون من استخدام البوت.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={toggleMaintenance}>
          {settings.maintenanceMode ? 'إيقاف وضع الصيانة' : 'تفعيل وضع الصيانة'}
        </button>
      </div>

      <div className="card">
        <h3 className="card-title">📤 صورة بطاقة المشاركة</h3>
        <p className="card-sub">
          هذي الصورة تنرسل مع رسالة "ربحت جائزة" الي يبعتها البوت للمستخدم عشان يحولها لأصدقائه. إذا ما حطيت صورة، تنرسل الرسالة نص بس.
        </p>
        {settings.shareImageUrl && (
          <img
            src={settings.shareImageUrl}
            alt=""
            style={{ width: '100%', maxWidth: 260, borderRadius: 12, margin: '10px 0', display: 'block' }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <label className="btn btn-secondary" style={{ cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {settings.shareImageUrl ? '📷 تغيير الصورة' : '📷 رفع صورة'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              style={{ display: 'none' }}
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) uploadShareImage(file);
              }}
            />
          </label>
          {settings.shareImageUrl && (
            <button className="btn btn-secondary" disabled={busy} onClick={clearShareImage}>
              🗑 حذف الصورة
            </button>
          )}
        </div>
      </div>

      <ResetGameStateCard />
    </>
  );
}

function ResetGameStateCard() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doReset() {
    const step1 = window.confirm(
      'هل انت متأكد؟\n\nهذا الإجراء يمسح نهائياً:\n• جوائز كل المستخدمين الموجودة بالمخزون\n• عدد فرات كل شخص (يرجع للصفر)\n• كل الإحالات وطلبات السحب وسجل الفرات\n\nولا يلمس: الجوائز نفسها (الأسماء والصور والنسب والمخزون بالمتجر) ولا الإعدادات.\n\nهذا الإجراء لا يمكن التراجع عنه!'
    );
    if (!step1) return;

    const typed = window.prompt('اكتب كلمة RESET بالضبط (حروف إنجليزية كبيرة) عشان تأكد:');
    if (typed !== 'RESET') {
      if (typed !== null) window.alert('ما طابقت الكلمة المطلوبة — تم الإلغاء، ما انمسح أي شي.');
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<{ ok: true; summary: Record<string, number> }>('/admin/reset-game-state', {
        confirm: 'RESET',
      });
      setResult(res.summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل تنفيذ إعادة التصفير');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ borderColor: 'var(--danger)' }}>
      <h3 className="card-title" style={{ color: 'var(--danger)' }}>
        ⚠️ إعادة تصفير البوت
      </h3>
      <p className="card-sub">
        يمسح جوائز المستخدمين، عدد الفرات، والإحالات — بدون ما يلمس الجوائز نفسها (الصور، الأسماء،
        النسب، أسعار المتجر). إجراء خطير وما ينرجع.
      </p>
      <button
        className="btn"
        style={{ marginTop: 12, background: 'var(--danger)', color: '#fff' }}
        disabled={busy}
        onClick={doReset}
      >
        {busy ? 'جاري التصفير...' : '⚠️ إعادة تصفير كامل'}
      </button>
      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
          ✅ تم: حذف {result.userPrizesDeleted} جائزة من المخزونات، {result.referralsDeleted} إحالة،{' '}
          {result.withdrawalsDeleted} طلب سحب، {result.spinsDeleted} سجل فرة — وصفّر {result.usersReset} مستخدم.
        </div>
      )}
    </div>
  );
}

type BroadcastScope = 'all' | 'channels' | 'direct';
interface BroadcastButtonForm {
  text: string;
  url: string;
}
interface BroadcastResult {
  sent: number;
  failed: number;
  blocked: number;
  total: number;
}

function BroadcastTab() {
  const [scope, setScope] = useState<BroadcastScope>('all');
  const [message, setMessage] = useState('');
  const [directIds, setDirectIds] = useState('');
  const [buttons, setButtons] = useState<BroadcastButtonForm[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addButton() {
    if (buttons.length >= 5) return;
    setButtons([...buttons, { text: '', url: '' }]);
  }

  function updateButton(i: number, field: 'text' | 'url', value: string) {
    setButtons(buttons.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  }

  function removeButton(i: number) {
    setButtons(buttons.filter((_, idx) => idx !== i));
  }

  async function send() {
    setError(null);
    setResult(null);

    if (!message.trim()) {
      setError('اكتب محتوى الرسالة أولاً.');
      return;
    }
    let telegramIds: number[] | undefined;
    if (scope === 'direct') {
      telegramIds = directIds
        .split(/[\s,]+/)
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (telegramIds.length === 0) {
        setError('اكتب آيديات تليجرام صحيحة (وحدة أو أكثر، مفصولة بفاصلة أو سطر جديد).');
        return;
      }
    }
    const validButtons = buttons.filter((b) => b.text.trim() && b.url.trim()).map((b) => ({ text: b.text.trim(), url: b.url.trim() }));

    const scopeLabel = scope === 'all' ? 'كل المستخدمين' : scope === 'channels' ? 'القنوات والكروبات' : `${telegramIds!.length} مستخدم محدد`;
    if (!window.confirm(`تأكيد إرسال الإذاعة إلى: ${scopeLabel}؟`)) return;

    setSending(true);
    try {
      const res = await api.post<{ ok: true; result: BroadcastResult }>('/admin/broadcast', {
        message: message.trim(),
        scope,
        telegramIds,
        buttons: validButtons.length > 0 ? validButtons : undefined,
      });
      setResult(res.result);
      setMessage('');
      setButtons([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل إرسال الإذاعة');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card">
      <h3 className="card-title">📣 إذاعة جديدة</h3>

      <label style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', marginBottom: 6, marginTop: 10 }}>
        لمن تريد إرسال الإذاعة؟
      </label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['all', 'channels', 'direct'] as BroadcastScope[]).map((s) => (
          <button
            key={s}
            className="pill"
            style={{ cursor: 'pointer', border: 'none', background: scope === s ? 'var(--accent)' : undefined }}
            onClick={() => setScope(s)}
          >
            {s === 'all' ? '👥 الكل' : s === 'channels' ? '📢 القنوات والكروبات' : '👤 مستخدمين محددين'}
          </button>
        ))}
      </div>

      {scope === 'direct' && (
        <textarea
          placeholder="آيديات تليجرام، وحدة بكل سطر أو مفصولة بفاصلة"
          value={directIds}
          onChange={(e) => setDirectIds(e.target.value)}
          style={{ ...inputStyle, minHeight: 70, marginBottom: 12 }}
        />
      )}

      <label style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', marginBottom: 6 }}>محتوى الرسالة</label>
      <textarea
        placeholder="اكتب محتوى الرسالة..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ ...inputStyle, minHeight: 110, marginBottom: 12 }}
      />

      <label style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', marginBottom: 6 }}>
        أزرار (اختياري — حتى 5 أزرار)
      </label>
      {buttons.map((b, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            placeholder="اسم الزر"
            value={b.text}
            onChange={(e) => updateButton(i, 'text', e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            placeholder="الرابط"
            value={b.url}
            onChange={(e) => updateButton(i, 'url', e.target.value)}
            style={{ ...inputStyle, flex: 2 }}
          />
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '0 12px' }} onClick={() => removeButton(i)}>
            ✕
          </button>
        </div>
      ))}
      {buttons.length < 5 && (
        <button className="btn btn-secondary" style={{ marginBottom: 12 }} onClick={addButton}>
          ➕ إضافة زر
        </button>
      )}

      {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

      <button className="btn btn-primary" disabled={sending} onClick={send} style={{ marginTop: 8 }}>
        {sending ? 'جاري الإرسال...' : '🚀 إرسال الإذاعة'}
      </button>

      {result && (
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>
          ✅ تم الإرسال: {result.sent} | ❌ فشل: {result.failed} | 🚫 محظور/حظر البوت: {result.blocked} | الإجمالي: {result.total}
        </div>
      )}
    </div>
  );
}

interface DashboardStats {
  users: { total: number; newToday: number; newThisWeek: number; newThisMonth: number; banned: number };
  spins: { total: number };
  prizes: {
    delivered: number;
    pending: number;
    expired: number;
    perPrize: Array<{ key: string; name: string; stock: number | string; delivered: number; pending: number; isActive: boolean }>;
  };
  referrals: { total: number; qualified: number; rejected: number };
  withdrawals: { pending: number; approved: number; rejected: number };
  channels: number;
  developers: number;
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 900 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get<{ ok: true; stats: DashboardStats }>('/admin/stats').then((res) => setStats(res.stats));
  }, []);

  if (!stats) return <LoadingScreen />;

  const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 } as const;

  return (
    <>
      <div className="card">
        <h3 className="card-title">👥 المستخدمون</h3>
        <div style={grid}>
          <StatBox label="الإجمالي" value={stats.users.total} />
          <StatBox label="جدد اليوم" value={stats.users.newToday} />
          <StatBox label="هذا الأسبوع" value={stats.users.newThisWeek} />
          <StatBox label="هذا الشهر" value={stats.users.newThisMonth} />
          <StatBox label="محظورين" value={stats.users.banned} />
          <StatBox label="السحبات" value={stats.spins.total} />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">🎁 الجوائز</h3>
        <div style={grid}>
          <StatBox label="مُسلَّمة" value={stats.prizes.delivered} />
          <StatBox label="قيد التحضير" value={stats.prizes.pending} />
          <StatBox label="منتهية" value={stats.prizes.expired} />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">👥 الإحالات</h3>
        <div style={grid}>
          <StatBox label="الإجمالي" value={stats.referrals.total} />
          <StatBox label="مؤهلة" value={stats.referrals.qualified} />
          <StatBox label="مرفوضة" value={stats.referrals.rejected} />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">📋 طلبات السحب</h3>
        <div style={grid}>
          <StatBox label="معلقة" value={stats.withdrawals.pending} />
          <StatBox label="مقبولة" value={stats.withdrawals.approved} />
          <StatBox label="مرفوضة" value={stats.withdrawals.rejected} />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">⚙️ عام</h3>
        <div style={grid}>
          <StatBox label="القنوات والكروبات" value={stats.channels} />
          <StatBox label="المطورين" value={stats.developers} />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">📦 مخزون كل جائزة</h3>
        {stats.prizes.perPrize.map((p) => (
          <div className="list-item" key={p.key}>
            <span>
              {p.name} {!p.isActive && <span style={{ color: 'var(--danger)', fontSize: 11 }}>(موقوفة)</span>}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              مخزون: {p.stock} | مُسلَّم: {p.delivered} | قيد التحضير: {p.pending}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
