import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteAuthUserForAdmin } from './adminUserDeletion.ts';

function createUserClient(role: 'admin' | 'member' | null) {
  return {
    from(table: string) {
      assert.equal(table, 'profiles');
      return {
        select(columns: string) {
          assert.equal(columns, 'role');
          return {
            eq(column: string, value: string) {
              assert.equal(column, 'id');
              assert.equal(value, 'acting-user');
              return {
                single() {
                  return Promise.resolve({
                    data: role ? { role } : null,
                    error: role ? null : { message: 'not found' },
                  });
                },
              };
            },
          };
        },
      };
    },
  };
}

function createAdminClient(error: { message: string } | null = null) {
  const deletedIds: string[] = [];
  return {
    deletedIds,
    auth: {
      admin: {
        async deleteUser(id: string) {
          deletedIds.push(id);
          return { error };
        },
      },
    },
  };
}

test('deleteAuthUserForAdmin rejects unauthenticated requests before admin deletion', async () => {
  const adminClient = createAdminClient();

  const result = await deleteAuthUserForAdmin({
    actingUserId: null,
    targetUserId: 'target-user',
    userClient: createUserClient('admin') as never,
    adminClient: adminClient as never,
  });

  assert.equal(result.status, 401);
  assert.deepEqual(adminClient.deletedIds, []);
});

test('deleteAuthUserForAdmin rejects non-admin users before admin deletion', async () => {
  const adminClient = createAdminClient();

  const result = await deleteAuthUserForAdmin({
    actingUserId: 'acting-user',
    targetUserId: 'target-user',
    userClient: createUserClient('member') as never,
    adminClient: adminClient as never,
  });

  assert.equal(result.status, 403);
  assert.deepEqual(adminClient.deletedIds, []);
});

test('deleteAuthUserForAdmin rejects deleting the signed-in admin account', async () => {
  const adminClient = createAdminClient();

  const result = await deleteAuthUserForAdmin({
    actingUserId: 'acting-user',
    targetUserId: 'acting-user',
    userClient: createUserClient('admin') as never,
    adminClient: adminClient as never,
  });

  assert.equal(result.status, 400);
  assert.deepEqual(adminClient.deletedIds, []);
});

test('deleteAuthUserForAdmin deletes the Supabase Auth user for admins', async () => {
  const adminClient = createAdminClient();

  const result = await deleteAuthUserForAdmin({
    actingUserId: 'acting-user',
    targetUserId: 'target-user',
    userClient: createUserClient('admin') as never,
    adminClient: adminClient as never,
  });

  assert.equal(result.status, 204);
  assert.deepEqual(adminClient.deletedIds, ['target-user']);
});
