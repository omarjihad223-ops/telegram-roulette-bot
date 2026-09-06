import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';

process.env.BOT_TOKEN = process.env.BOT_TOKEN || 'test-bot-token';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
process.env.OWNER_ID = process.env.OWNER_ID || '123456';
process.env.WEBAPP_SECRET = process.env.WEBAPP_SECRET || 'a'.repeat(32);

function buildValidInitData(botToken: string, overrides: Record<string, string> = {}) {
  const params: Record<string, string> = {
    user: JSON.stringify({ id: 999, first_name: 'Test', username: 'tester' }),
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAA',
    ...overrides,
  };
  const dataCheckString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const usp = new URLSearchParams({ ...params, hash });
  return usp.toString();
}

describe('verifyTelegramInitData', () => {
  let verifyTelegramInitData: typeof import('../src/utils/telegramAuth').verifyTelegramInitData;

  beforeAll(async () => {
    ({ verifyTelegramInitData } = await import('../src/utils/telegramAuth'));
  });

  it('accepts correctly signed initData', () => {
    const initData = buildValidInitData('test-bot-token');
    const result = verifyTelegramInitData(initData);
    expect(result.user.id).toBe(999);
  });

  it('rejects tampered user_id (signature mismatch)', () => {
    const initData = buildValidInitData('test-bot-token');
    // Simulate an attacker editing the user field after signing.
    const params = new URLSearchParams(initData);
    params.set('user', JSON.stringify({ id: 1, first_name: 'Attacker' }));
    expect(() => verifyTelegramInitData(params.toString())).toThrow(/signature mismatch/);
  });

  it('rejects a wrong bot token signature', () => {
    const initData = buildValidInitData('some-other-bot-token');
    expect(() => verifyTelegramInitData(initData)).toThrow(/signature mismatch/);
  });

  it('rejects expired auth_date', () => {
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 999999);
    const initData = buildValidInitData('test-bot-token', { auth_date: oldTimestamp });
    expect(() => verifyTelegramInitData(initData)).toThrow(/expired/);
  });

  it('rejects missing hash', () => {
    expect(() => verifyTelegramInitData('user=%7B%7D&auth_date=123')).toThrow(/missing hash/);
  });
});
