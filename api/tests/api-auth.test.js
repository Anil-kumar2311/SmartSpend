import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { authPasswordSchema } from '../src/routes/auth.js';
import { Budget } from '../src/models/Budget.js';
import { MerchantRule } from '../src/models/MerchantRule.js';
import { Transaction } from '../src/models/Transaction.js';
import { User } from '../src/models/User.js';

test('protected routes, health checks, and API errors have safe responses', async (context) => {
  const server = app.listen(0);
  context.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;

  for (const path of ['/api/transactions', '/api/budgets/2026-11', '/api/ai/insights?month=2026-11']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 401, `${path} must require an authenticated user`);
    assert.deepEqual(await response.json(), { error: 'Authentication required.' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }

  const health = await fetch(`${origin}/api/health`);
  assert.equal(health.status, 503);
  assert.deepEqual(await health.json(), { status: 'unavailable', database: 'disconnected' });

  const malformedJson = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(malformedJson.status, 400);
  assert.deepEqual(await malformedJson.json(), { error: 'Request body must be valid JSON.' });

  const disallowedOrigin = await fetch(`${origin}/api/health`, {
    headers: { Origin: 'https://attacker.example' },
  });
  assert.equal(disallowedOrigin.status, 403);
  assert.deepEqual(await disallowedOrigin.json(), { error: 'Origin is not allowed.' });
});

test('password limits match bcrypt input capacity', () => {
  assert.equal(authPasswordSchema.safeParse('a'.repeat(72)).success, true);
  assert.equal(authPasswordSchema.safeParse('a'.repeat(73)).success, false);
  assert.equal(authPasswordSchema.safeParse('😀'.repeat(18)).success, true);
  assert.equal(authPasswordSchema.safeParse('😀'.repeat(19)).success, false);
});

test('database schemas declare owner-oriented and uniqueness indexes', () => {
  const hasIndex = (schema, keys, options = {}) => schema.indexes().some(([indexKeys, indexOptions]) => (
    JSON.stringify(indexKeys) === JSON.stringify(keys)
    && Object.entries(options).every(([key, value]) => indexOptions[key] === value)
  ));

  assert.equal(hasIndex(User.schema, { email: 1 }, { unique: true }), true);
  assert.equal(hasIndex(Transaction.schema, { userId: 1, date: -1 }), true);
  assert.equal(hasIndex(Transaction.schema, { userId: 1, type: 1, category: 1, date: -1 }), true);
  assert.equal(hasIndex(Budget.schema, { userId: 1, month: 1 }, { unique: true }), true);
  assert.equal(hasIndex(MerchantRule.schema, { userId: 1, normalizedMerchant: 1 }, { unique: true }), true);
});
