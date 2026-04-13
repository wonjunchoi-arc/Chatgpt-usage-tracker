import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getAllTeamsWithStats } from '@/lib/queries';
import type { TimeRange } from '@/lib/types';
import TimeRangeFilter from '@/components/dashboard/TimeRangeFilter';
import TeamsCompareChart from '@/components/dashboard/TeamsCompareChart';

interface Props {
  searchParams: Promise<{ range?: string }>;
}

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams;
  const range = (['24h', '7d', '30d'].includes(params.range || '') ? params.range : '7d') as TimeRange;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const teams = await getAllTeamsWithStats(supabase, range);

  const totalEvents = teams.reduce((sum, t) => sum + t.eventCount, 0);
  const totalMembers = teams.reduce((sum, t) => sum + t.memberCount, 0);
  const activeTeams = teams.filter(t => t.eventCount > 0).length;
  const avgEventsPerTeam = teams.length ? (totalEvents / teams.length).toFixed(1) : '0';

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">전체 팀 비교</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">팀별 ChatGPT 사용량 한눈에 보기</p>
        </div>
        <Suspense>
          <TimeRangeFilter />
        </Suspense>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">전체 팀</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{teams.length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">활성 팀 (기간 내)</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeTeams}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">전체 이벤트</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalEvents.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">전체 팀원 / 팀 평균</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalMembers.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">팀당 평균 {avgEventsPerTeam}회</p>
        </div>
      </div>

      <TeamsCompareChart teams={teams} range={range} />
    </div>
  );
}
