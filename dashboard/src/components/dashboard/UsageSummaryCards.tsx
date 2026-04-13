import type { TeamStats } from '@/lib/types';

interface Props {
  stats: TeamStats;
}

const cards = [
  { key: 'totalEvents', label: '총 이벤트' },
  { key: 'models', label: '모델 종류' },
  { key: 'apps', label: '앱 유형' },
  { key: 'features', label: '기능 종류' },
] as const;

export default function UsageSummaryCards({ stats }: Props) {
  const values: Record<string, number> = {
    totalEvents: stats.totalEvents,
    models: Object.keys(stats.modelCounts).length,
    apps: Object.keys(stats.appCounts).length,
    features: Object.keys(stats.featureCounts).length,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label }) => (
        <div
          key={key}
          className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {values[key].toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
