import Link from 'next/link';
import { getProfileDisplayName, type ProfileWithUsage } from '@/lib/types';

interface Props {
  users: ProfileWithUsage[];
}

export default function LowUsageMembersCard({ users }: Props) {
  const sorted = [...users].sort((a, b) => a.eventCount - b.eventCount);
  const bottomCount = sorted.length ? Math.max(1, Math.floor(sorted.length * 0.3)) : 0;
  const lowUsageUsers = sorted.slice(0, bottomCount);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">하위 30% 사용량 팀원</h3>
          <p className="text-xs text-gray-400 mt-1">이벤트 수 기준으로 사용량이 가장 적은 팀원을 표시합니다.</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 font-medium">
          {lowUsageUsers.length.toLocaleString()}명
        </span>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
        {lowUsageUsers.map(user => (
          <div key={user.id} className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={`/dashboard/user/${user.id}`}
                className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline break-all"
              >
                {getProfileDisplayName(user)}
              </Link>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {user.role === 'admin' ? '관리자' : '멤버'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400">이벤트</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {user.eventCount.toLocaleString()}
              </p>
            </div>
          </div>
        ))}

        {!lowUsageUsers.length && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            표시할 팀원이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
