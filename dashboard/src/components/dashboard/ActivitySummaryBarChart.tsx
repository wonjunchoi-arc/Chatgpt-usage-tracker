'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { ACTIVITY_KEYS } from '@/lib/types';

interface SummaryOption {
  id: string;
  label: string;
  totalEvents: number;
  activityCounts: Record<string, number>;
}

interface Props {
  options: SummaryOption[];
  defaultId: string;
}

export default function ActivitySummaryBarChart({ options, defaultId }: Props) {
  const [selectedId, setSelectedId] = useState(defaultId);

  const selected = options.find(option => option.id === selectedId) || options[0];
  const chartData = [
    { label: '전체 이벤트', value: selected.totalEvents, color: '#0f172a' },
    ...ACTIVITY_KEYS.map(({ key, label, color }) => ({
      label,
      value: selected.activityCounts[key] || 0,
      color,
    })),
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">활동 요약</h3>
          <p className="text-xs text-gray-400 mt-1">기본값은 팀 전체이며, 팀원별 사용량도 확인할 수 있습니다.</p>
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {options.map(option => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            angle={-20}
            textAnchor="end"
            interval={0}
            height={56}
          />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}회`, '사용량']} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={28}>
            {chartData.map(entry => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
