import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import {
  getAllTeams,
  getTeamDashboardSummary,
  getTeamEvents,
  getTeamMembersWithSummaryUsage,
  getMemberSummaryOptions,
  aggregateStats,
} from '@/lib/queries';
import { getCurrentMonthKey, type MonthKey } from '@/lib/types';
import TimeRangeFilter from '@/components/dashboard/TimeRangeFilter';
import ModelDistributionChart from '@/components/dashboard/ModelDistributionChart';
import ActivityBreakdownChart from '@/components/dashboard/ActivityBreakdownChart';
import UserTable from '@/components/dashboard/UserTable';
import TeamSelector from '@/components/dashboard/TeamSelector';
import ActivitySummaryBarChart from '@/components/dashboard/ActivitySummaryBarChart';
import LowUsageMembersCard from '@/components/dashboard/LowUsageMembersCard';

interface Props {
  searchParams: Promise<{ month?: string; teamId?: string }>;
}

export default async function TeamPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = (params.month || getCurrentMonthKey()) as MonthKey;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const teams = await getAllTeams(supabase);

  if (!teams.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">등록된 팀이 없습니다.</p>
      </div>
    );
  }

  const selectedTeam = teams.find(t => t.id === params.teamId) ?? teams[0];

  const [events, summary, membersWithUsage, memberSummaryOptions] = await Promise.all([
    getTeamEvents(supabase, selectedTeam.id, month),
    getTeamDashboardSummary(supabase, selectedTeam.id, month),
    getTeamMembersWithSummaryUsage(supabase, selectedTeam.id, month),
    getMemberSummaryOptions(supabase, selectedTeam.id, month),
  ]);
  const dailyStats = aggregateStats(events);

  const summaryOptions = [
    {
      id: '__team__',
      label: '전체 팀원',
      totalEvents: summary.totalEvents,
      activityCounts: summary.activityCounts,
    },
    ...memberSummaryOptions,
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">팀 대시보드</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedTeam.name} · {month}</p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <TeamSelector teams={teams} selectedId={selectedTeam.id} />
          </Suspense>
          <Suspense>
            <TimeRangeFilter />
          </Suspense>
        </div>
      </div>

      {/* Activity summary chart */}
      <ActivitySummaryBarChart options={summaryOptions} defaultId="__team__" />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityBreakdownChart data={dailyStats.dailyBreakdown} />
        <ModelDistributionChart data={summary.modelCounts} />
      </div>

      <LowUsageMembersCard users={membersWithUsage} />

      {/* Team members */}
      <UserTable users={membersWithUsage} />
    </div>
  );
}
