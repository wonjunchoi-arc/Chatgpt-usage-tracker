'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const FEATURE_LABELS: Record<string, string> = {
  search: '검색',
  'connector-app': '앱 연결',
  'project-context': '프로젝트',
  'source-context': '소스',
  'github-context': 'GitHub',
  'pro-model': 'Pro 모델',
  'data-analysis': '데이터 분석',
  'file-analysis': '파일',
  'image-analysis': '이미지 분석',
  'image-generation': '이미지 생성',
  canvas: '캔버스',
  memory: '메모리',
  voice: '음성',
  'custom-instructions': '커스텀 지시',
};

interface Props {
  data: Record<string, number>;
}

export default function FeatureUsageChart({ data }: Props) {
  const chartData = Object.entries(data)
    .map(([key, value]) => ({ name: FEATURE_LABELS[key] || key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (!chartData.length) {
    return <p className="text-sm text-gray-400">데이터 없음</p>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">기능 사용 빈도</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
