import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfile, getAllTeamsWithAdminStats } from '@/lib/queries';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await getProfile(supabase, user.id);
  if (!profile) redirect('/login');
  if (profile.role !== 'admin') redirect('/dashboard/team');

  const teamData = await getAllTeamsWithAdminStats(supabase);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">전체 팀 관리</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">관리자 전용</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">팀 이름</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">멤버</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">총 이벤트</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">생성일</th>
            </tr>
          </thead>
          <tbody>
            {teamData.map(team => (
              <tr key={team.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/team?teamId=${team.id}`}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    {team.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                  {team.memberCount}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                  {team.eventCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {new Date(team.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
            {!teamData.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  팀이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
