import Link from 'next/link';
import { getProfileDisplayName, type ProfileWithUsage } from '@/lib/types';

interface Props {
  users: ProfileWithUsage[];
}

export default function UserTable({ users }: Props) {
  const sorted = [...users].sort((a, b) => b.eventCount - a.eventCount);

  const bottomCount = sorted.length ? Math.max(1, Math.floor(sorted.length * 0.3)) : 0;
  const bottomIds = new Set(
    [...sorted].reverse().slice(0, bottomCount).map(u => u.id)
  );

  const avg = sorted.length
    ? Math.round(sorted.reduce((s, u) => s + u.eventCount, 0) / sorted.length)
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">팀원 사용량</h3>
        <span className="text-xs text-gray-400">평균 {avg.toLocaleString()}회</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-medium">이름</th>
            <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-medium">권한</th>
            <th className="text-right px-4 py-2 text-gray-500 dark:text-gray-400 font-medium">이벤트</th>
            <th className="text-right px-4 py-2 text-gray-500 dark:text-gray-400 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(user => {
            const isBottom = bottomIds.has(user.id);
            return (
              <tr
                key={user.id}
                className={`border-b border-gray-50 dark:border-gray-700/50 ${
                  isBottom
                    ? 'bg-red-50/50 dark:bg-red-900/10'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/dashboard/user/${user.id}`}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    {getProfileDisplayName(user)}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                  {user.role === 'admin' ? '관리자' : '멤버'}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-900 dark:text-white">
                  {user.eventCount.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {isBottom && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-medium">
                      하위 30%
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {!sorted.length && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                팀원이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
