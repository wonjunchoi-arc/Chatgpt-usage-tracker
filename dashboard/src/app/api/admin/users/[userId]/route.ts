import { deleteAuthUserForAdmin } from '@/lib/adminUserDeletion';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const [{ userId }, userClient] = await Promise.all([
    context.params,
    createClient(),
  ]);

  const {
    data: { user },
  } = await userClient.auth.getUser();

  try {
    const result = await deleteAuthUserForAdmin({
      actingUserId: user?.id ?? null,
      targetUserId: userId,
      userClient,
      adminClient: createAdminClient(),
    });

    if (result.status === 204) {
      return new Response(null, { status: 204 });
    }

    return Response.json(
      { error: result.error || '사용자 삭제에 실패했습니다.' },
      { status: result.status }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '사용자 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
