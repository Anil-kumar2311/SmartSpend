import test from 'node:test';
import assert from 'node:assert/strict';
import { requestModelJson } from '../src/services/model-provider.js';

test('model provider returns null when no API key is configured', async (context) => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  context.after(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  });

  assert.equal(await requestModelJson({ system: 'system', user: {} }), null);
});

test('model provider deadline covers response body reading', async (context) => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  context.after(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  });

  await assert.rejects(() => requestModelJson({
    system: 'system',
    user: {},
    timeoutMs: 20,
    fetchImpl: async (_url, { signal }) => ({
      ok: true,
      json: () => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('response body aborted')), { once: true });
      }),
    }),
  }), /response body aborted/);
});
