import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getProfile, getUserEvents, aggregateStats } from '@/lib/queries';
import { getCurrentMonthKey, getProfileDisplayName, type MonthKey } from '@/lib/types';
import TimeRangeFilter from '@/components/dashboard/TimeRangeFilter';
import ModelDistributionChart from '@/components/dashboard/ModelDistributionChart';
import ActivityCountCards from '@/components/dashboard/ActivityCountCards';
import ActivityBreakdownChart from '@/components/dashboard/ActivityBreakdownChart';

interface Props {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ month?: string }>;
}

export default async function UserDetailPage({ params, searchParams }: Props) {
  const { userId } = await params;
  const sp = await searchParams;
  const month = (sp.month || getCurrentMonthKey()) as MonthKey;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const targetProfile = await getProfile(supabase, userId);
  if (!targetProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">사용자를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const events = await getUserEvents(supabase, userId, month);
  const stats = aggregateStats(events);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{getProfileDisplayName(targetProfile)}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {targetProfile.role === 'admin' ? '관리자' : '멤버'} · {targetProfile.email} · {month}
          </p>
        </div>
        <Suspense>
          <TimeRangeFilter />
        </Suspense>
      </div>

      {/* Activity count cards */}
      <ActivityCountCards activityCounts={stats.activityCounts} totalEvents={stats.totalEvents} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityBreakdownChart data={stats.dailyBreakdown} />
        <ModelDistributionChart data={stats.modelCounts} />
      </div>

      {/* Recent events table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">최근 이벤트</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-2 text-gray-500 font-medium">시간</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">모델</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">앱</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">기능</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 50).map(event => (
                <tr key={event.id} className="border-b border-gray-50 dark:border-gray-700/50">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(event.server_ts).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                    {event.display_name || event.model_id}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{event.app}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {event.features.slice(0, 3).map(f => (
                        <span
                          key={f}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!events.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    이벤트가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
