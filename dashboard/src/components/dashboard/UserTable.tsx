'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ACTIVITY_KEYS, getProfileDisplayName, type ProfileWithUsage } from '@/lib/types';

interface Props {
  users: ProfileWithUsage[];
}

export default function UserTable({ users }: Props) {
  const [expanded, setExpanded] = useState(false);

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
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">평균 {avg.toLocaleString()}회</span>
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="text-xs px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            {expanded ? '닫기' : '자세히 보기'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">이름</th>
              <th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">권한</th>
              <th className="text-right px-4 py-2 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">이벤트</th>
              {expanded && ACTIVITY_KEYS.map(({ key, label, color }) => (
                <th
                  key={key}
                  className="text-right px-3 py-2 font-medium whitespace-nowrap"
                  style={{ color }}
                >
                  {label}
                </th>
              ))}
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
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/dashboard/user/${user.id}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                    >
                      {getProfileDisplayName(user)}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {user.role === 'admin' ? '관리자' : '멤버'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                    {user.eventCount.toLocaleString()}
                  </td>
                  {expanded && ACTIVITY_KEYS.map(({ key }) => (
                    <td key={key} className="px-3 py-2.5 text-right font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {(user.activityCounts[key] || 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
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
                <td colSpan={expanded ? 3 + ACTIVITY_KEYS.length : 4} className="px-4 py-6 text-center text-gray-400">
                  팀원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
