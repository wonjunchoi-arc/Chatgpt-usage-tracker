'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  data: { date: string; count: number }[];
}

export default function ActivityTimeline({ data }: Props) {
  if (!data.length) {
    return <p className="text-sm text-gray-400">데이터 없음</p>;
  }

  const formatted = data.map(d => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">일별 활동 추이</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="이벤트"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
