import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Challenge {
  sessionId: string;
  question: string;
  options: number[];
}

export function CaptchaGate({ onPassed }: { onPassed: () => void }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadChallenge() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ ok: true; alreadyPassed: boolean; challenge?: Challenge }>('/captcha/request');
      if (res.alreadyPassed) {
        onPassed();
        return;
      }
      setChallenge(res.challenge ?? null);
    } catch {
      setError('تعذر تحميل التحقق، حاول مرة ثانية.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(answer: number) {
    if (!challenge || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/captcha/submit', { sessionId: challenge.sessionId, answer });
      onPassed();
    } catch {
      setError('إجابة خاطئة، حاول مرة ثانية.');
      loadChallenge();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-content" style={{ paddingTop: 60 }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🧩</div>
        <h2 className="card-title">تحقق سريع</h2>
        <p className="card-sub">حل المسألة البسيطة عشان نتأكد إنك مو بوت</p>

        {loading && <p style={{ marginTop: 20 }}>...</p>}
        {!loading && challenge && (
          <>
            <div style={{ fontSize: 26, fontWeight: 900, margin: '20px 0 4px' }}>{challenge.question}</div>
            <div className="captcha-options">
              {challenge.options.map((opt) => (
                <button
                  key={opt}
                  className="captcha-option"
                  disabled={submitting}
                  onClick={() => submit(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}
        {error && <p style={{ color: 'var(--danger)', marginTop: 14 }}>{error}</p>}
      </div>
    </div>
  );
}
