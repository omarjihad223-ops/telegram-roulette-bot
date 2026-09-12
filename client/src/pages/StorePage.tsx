import React, { useState } from 'react';
import { api, ApiError } from '../services/api';
import { LoadingScreen, EmptyState, Toast } from '../components/Common';
import { useCachedFetch } from '../hooks/useCachedFetch';
import { haptic } from '../hooks/useTelegramWebApp';

interface StoreProduct {
  key: string;
  name: string;
  icon: string;
  imageUrl: string | null;
  price: number;
}

export function StorePage({ spinPoints, onBack, refreshMe }: { spinPoints: number; onBack: () => void; refreshMe: () => void }) {
  const { data: products, error, refetch } = useCachedFetch<StoreProduct[]>('store-products', async () => {
    const res = await api.get<{ ok: true; products: StoreProduct[] }>('/store/products');
    return res.products;
  });
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function buy(product: StoreProduct) {
    if (spinPoints < product.price) {
      setToast('عدد فراتك ما يكفي لشراء هذي الجائزة.');
      return;
    }
    if (!window.confirm(`تأكيد شراء "${product.name}" مقابل ${product.price} فرة؟`)) return;

    setBuyingKey(product.key);
    haptic('medium');
    try {
      await api.post<{ ok: true; prizeName: string; remainingBalance: number }>('/store/purchase', { key: product.key });
      setToast(`🎉 اشتريت "${product.name}"! تكدر تستلمها من المخزون.`);
      haptic('heavy');
      refreshMe();
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INSUFFICIENT_BALANCE') {
        setToast('عدد فراتك ما يكفي لشراء هذي الجائزة.');
      } else {
        setToast('صار خطأ، حاول مرة ثانية.');
      }
    } finally {
      setBuyingKey(null);
    }
  }

  return (
    <div>
      <div className="header-row">
        <h2 style={{ margin: 0 }}>🏪 المتجر</h2>
        <button className="pill" style={{ cursor: 'pointer', border: 'none' }} onClick={onBack}>
          ← رجوع
        </button>
      </div>

      <div
        className="card"
        style={{
          textAlign: 'center',
          marginBottom: 16,
          background: 'linear-gradient(160deg, #0f3a52 0%, #16283f 100%)',
          borderColor: 'rgba(79,216,255,0.35)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>رصيدك الحالي</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-cyan)' }}>🎰 {spinPoints} فرة</div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {!products && !error && <LoadingScreen />}
      {!products && Boolean(error) && <LoadingScreen label="تعذر التحميل، حاول لاحقاً" />}
      {products && products.length === 0 && <EmptyState icon="🏪" title="ماكو منتجات بالمتجر حالياً" />}

      {products && products.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {products.map((p) => (
            <div key={p.key} className="card" style={{ textAlign: 'center', padding: 14 }}>
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt=""
                  style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', margin: '0 auto 8px' }}
                />
              ) : (
                <div style={{ fontSize: 40, marginBottom: 8 }}>{p.icon}</div>
              )}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, minHeight: 34 }}>{p.name}</div>
              <div style={{ fontSize: 14, color: 'var(--accent-glow)', fontWeight: 800, marginBottom: 10 }}>
                🎰 {p.price}
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '8px 0', fontSize: 13 }}
                disabled={buyingKey === p.key || spinPoints < p.price}
                onClick={() => buy(p)}
              >
                {buyingKey === p.key ? 'جاري الشراء...' : spinPoints < p.price ? 'رصيد غير كافي' : 'شراء'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
