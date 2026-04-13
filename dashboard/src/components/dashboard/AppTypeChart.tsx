'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const APP_LABELS: Record<string, string> = {
  chat: '채팅',
  workspace: '작업공간',
  connector: '앱',
  project: '프로젝트',
  canvas: '캔버스',
  images: '이미지',
  voice: '음성',
};

interface Props {
  data: Record<string, number>;
}

export default function AppTypeChart({ data }: Props) {
  const chartData = Object.entries(data)
    .map(([key, value]) => ({ name: APP_LABELS[key] || key, value }))
    .sort((a, b) => b.value - a.value);

  if (!chartData.length) {
    return <p className="text-sm text-gray-400">데이터 없음</p>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">앱 유형 분포</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
