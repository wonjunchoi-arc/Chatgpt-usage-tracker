'use client';

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { ACTIVITY_KEYS } from '@/lib/types';

interface Props {
  data: Array<Record<string, string | number>>;
}

export default function ActivityBreakdownChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">기간별 활동 추이</h3>
        <p className="text-sm text-gray-400 py-8 text-center">데이터 없음</p>
      </div>
    );
  }

  const formatted = data.map(d => ({
    label: (d.date as string).slice(5),
    ...Object.fromEntries(ACTIVITY_KEYS.map(({ key }) => [key, Number(d[key] || 0)])),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">기간별 활동 추이</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formatted} margin={{ left: 0, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => {
              const found = ACTIVITY_KEYS.find(a => a.key === value);
              return found ? found.label : value;
            }}
          />
          {ACTIVITY_KEYS.map(({ key, color }) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 2, fill: color }}
              activeDot={{ r: 5 }}
              name={key}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
