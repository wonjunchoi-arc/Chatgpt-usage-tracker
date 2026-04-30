import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteProfileByAdmin } from './queries.ts';

test('deleteProfileByAdmin delegates full user deletion to the server-only admin API', async (t) => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await deleteProfileByAdmin('user-123');

  assert.deepEqual(calls, [
    {
      url: '/api/admin/users/user-123',
      init: { method: 'DELETE' },
    },
  ]);
}
);
