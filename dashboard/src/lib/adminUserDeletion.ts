import type { SupabaseClient } from '@supabase/supabase-js';

export interface DeleteAuthUserForAdminArgs {
  actingUserId: string | null;
  targetUserId: string;
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
}

export interface DeleteAuthUserForAdminResult {
  status: number;
  error?: string;
}

export async function deleteAuthUserForAdmin(
  args: DeleteAuthUserForAdminArgs
): Promise<DeleteAuthUserForAdminResult> {
  if (!args.actingUserId) {
    return { status: 401, error: '로그인이 필요합니다.' };
  }

  if (args.actingUserId === args.targetUserId) {
    return { status: 400, error: '현재 로그인한 계정은 삭제할 수 없습니다.' };
  }

  const { data: profile } = await args.userClient
    .from('profiles')
    .select('role')
    .eq('id', args.actingUserId)
    .single();

  if (profile?.role !== 'admin') {
    return { status: 403, error: '사용자를 삭제할 권한이 없습니다.' };
  }

  const { error } = await args.adminClient.auth.admin.deleteUser(args.targetUserId);
  if (error) {
    return { status: 500, error: error.message };
  }

  return { status: 204 };
}
