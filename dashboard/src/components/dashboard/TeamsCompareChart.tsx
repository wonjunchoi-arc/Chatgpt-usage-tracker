'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import type { TeamWithStats } from '@/lib/queries';
import Link from 'next/link';
import { Fragment } from 'react';
import { ACTIVITY_KEYS } from '@/lib/types';

interface Props {
  teams: TeamWithStats[];
  range: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function getActivityLabel(activity: string | null) {
  return ACTIVITY_KEYS.find(item => item.key === activity)?.label ?? '-';
}

export default function TeamsCompareChart({ teams, range }: Props) {
  const chartData = teams
    .filter(t => t.eventCount > 0)
    .map((t, i) => ({
      id: t.id,
      name: t.name,
      events: t.eventCount,
      eventsPerMember: t.eventsPerMember,
      color: COLORS[i % COLORS.length],
    }));

  const heatmapMax = Math.max(
    1,
    ...teams.flatMap(team => ACTIVITY_KEYS.map(({ key }) => team.activityCounts[key] || 0))
  );
  const mostUsedTeam = [...teams].sort((a, b) => b.eventCount - a.eventCount)[0];
  const leastUsedTeam = [...teams].sort((a, b) => a.eventCount - b.eventCount)[0];
  const highestPerMemberTeam = [...teams].sort((a, b) => b.eventsPerMember - a.eventsPerMember)[0];
  const featureChampions = ACTIVITY_KEYS.map(({ key, label }) => {
    const champion = [...teams].sort((a, b) => (b.activityCounts[key] || 0) - (a.activityCounts[key] || 0))[0];
    return {
      key,
      label,
      teamName: champion?.name ?? '-',
      count: champion?.activityCounts[key] || 0,
    };
  }).filter(item => item.count > 0);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">팀별 전체 사용량</h3>
            <p className="text-xs text-gray-400 mt-1">총 이벤트와 팀원 1인당 평균 사용량을 함께 비교합니다.</p>
          </div>
        </div>
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">해당 기간 데이터 없음</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 32 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'eventsPerMember') return [`${Number(value).toLocaleString()}회`, '1인당 평균'];
                  return [Number(value).toLocaleString(), '이벤트'];
                }}
              />
              <Bar dataKey="events" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 overflow-x-auto">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">팀별 기능 사용 히트맵</h3>
          <p className="text-xs text-gray-400 mb-4">색이 진할수록 해당 팀이 그 기능을 더 많이 사용한 것입니다.</p>
          <div className="min-w-[760px]">
            <div
              className="grid gap-2 items-center"
              style={{ gridTemplateColumns: `180px repeat(${ACTIVITY_KEYS.length}, minmax(72px, 1fr))` }}
            >
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">팀</div>
              {ACTIVITY_KEYS.map(({ key, label }) => (
                <div key={key} className="text-xs font-semibold text-gray-400 text-center">{label}</div>
              ))}

              {teams.map((team) => (
                <Fragment key={team.id}>
                  <Link
                    href={`/dashboard/team?teamId=${team.id}&range=${range}`}
                    className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 truncate"
                  >
                    {team.name}
                  </Link>
                  {ACTIVITY_KEYS.map(({ key, color }) => {
                    const value = team.activityCounts[key] || 0;
                    const opacity = value === 0 ? 0.08 : Math.max(0.18, value / heatmapMax);
                    return (
                      <div
                        key={`${team.id}-${key}`}
                        className="h-12 rounded-lg flex items-center justify-center text-xs font-semibold border border-white/40"
                        style={{ backgroundColor: color, opacity }}
                        title={`${team.name} · ${getActivityLabel(key)}: ${value.toLocaleString()}회`}
                      >
                        <span className="text-slate-950">{value}</span>
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">자동 인사이트</h3>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">전체 사용량 최다</p>
                <p className="font-semibold text-gray-900 dark:text-white">{mostUsedTeam?.name ?? '-'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  이벤트 {mostUsedTeam?.eventCount.toLocaleString() ?? 0}회
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">전체 사용량 최저</p>
                <p className="font-semibold text-gray-900 dark:text-white">{leastUsedTeam?.name ?? '-'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  이벤트 {leastUsedTeam?.eventCount.toLocaleString() ?? 0}회
                </p>
              </div>
              <div className="rounded-lg bg-sky-50 dark:bg-sky-950/30 p-3">
                <p className="text-xs text-sky-700 dark:text-sky-300 mb-1">1인당 사용량 최고</p>
                <p className="font-semibold text-gray-900 dark:text-white">{highestPerMemberTeam?.name ?? '-'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  팀원당 {highestPerMemberTeam?.eventsPerMember.toLocaleString() ?? 0}회
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">기능별 챔피언</h3>
            <div className="space-y-2">
              {featureChampions.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 dark:bg-gray-900/60 px-3 py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.teamName}</p>
                    <p className="text-xs text-gray-400">{item.count.toLocaleString()}회</p>
                  </div>
                </div>
              ))}
              {!featureChampions.length && (
                <p className="text-sm text-gray-400">표시할 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">팀</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">멤버</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">활성 멤버</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">이벤트</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">1인당 평균</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">가장 많이 쓰는 기능</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">가장 적게 쓰는 기능</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">주요 모델</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => (
              <tr
                key={team.id}
                className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <Link
                      href={`/dashboard/team?teamId=${team.id}&range=${range}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                    >
                      {team.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                  {team.memberCount}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                  {team.activeMembers > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">{team.activeMembers}</span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                  {team.eventCount > 0 ? team.eventCount.toLocaleString() : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                  {team.eventsPerMember.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                  {getActivityLabel(team.topActivity)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                  {getActivityLabel(team.leastActivity)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                  {team.topModel ?? <span className="text-gray-400">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
