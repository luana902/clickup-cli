import test from 'node:test';
import assert from 'node:assert/strict';

import { ClickUpClient } from '../src/http/clickup-client.mjs';

test('ClickUpClient sends authorization and parses JSON responses', async () => {
  const calls = [];
  const client = new ClickUpClient({
    token: 'pk_test',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  const result = await client.requestV2('/user');
  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0].url, 'https://api.clickup.com/api/v2/user');
  assert.equal(calls[0].options.headers.Authorization, 'pk_test');
});

test('ClickUpClient handles empty responses', async () => {
  const client = new ClickUpClient({
    token: 'pk_test',
    fetchImpl: async () => new Response(null, { status: 204 }),
  });

  const result = await client.requestV2('/comment/1', { method: 'DELETE' });
  assert.deepEqual(result, {});
});

test('ClickUpClient throws rich API errors', async () => {
  const client = new ClickUpClient({
    token: 'pk_test',
    fetchImpl: async () =>
      new Response('bad request', {
        status: 400,
        headers: { 'content-type': 'text/plain' },
      }),
  });

  await assert.rejects(
    client.requestV2('/task/1'),
    /ClickUp API error: 400 GET https:\/\/api\.clickup\.com\/api\/v2\/task\/1 - bad request/
  );
});
