import { ACTIVITY_KEYS } from '@/lib/types';

interface Props {
  activityCounts: Record<string, number>;
  totalEvents: number;
}

export default function ActivityCountCards({ activityCounts, totalEvents }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">전체 이벤트</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {totalEvents.toLocaleString()}
          </p>
        </div>
        {ACTIVITY_KEYS.map(({ key, label, color }) => (
          <div
            key={key}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(activityCounts[key] || 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
