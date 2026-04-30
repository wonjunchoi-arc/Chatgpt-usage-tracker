import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function loadSupabaseHelpers(storage = {}) {
  const calls = [];
  const sandbox = {
    URL,
    Date,
    JSON,
    String,
    Error,
    console,
    chrome: {
      storage: {
        local: {
          get(keys, callback) {
            const result = {};
            for (const key of keys) result[key] = storage[key];
            callback(result);
          },
          set(data, callback) {
            Object.assign(storage, data);
            callback();
          },
        },
      },
    },
    fetch: async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        async json() {
          return {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            user: { id: 'user-1', email: 'ada@example.com' },
          };
        },
      };
    },
  };

  vm.createContext(sandbox);
  const source = await readFile(new URL('./supabase.js', import.meta.url), 'utf8');
  vm.runInContext(source, sandbox);
  return { sandbox, calls, storage };
}

test('signUp sends display name as Supabase Auth user metadata', async () => {
  const { sandbox, calls } = await loadSupabaseHelpers({
    workspaceSupabaseUrl: 'https://example.supabase.co',
    workspaceSupabaseAnonKey: 'anon-key',
  });

  await sandbox.signUp('ada@example.com', 'password123', ' Ada Lovelace ');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.supabase.co/auth/v1/signup');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    email: 'ada@example.com',
    password: 'password123',
    data: {
      display_name: 'Ada Lovelace',
      signup_source: 'extension',
    },
  });
});
