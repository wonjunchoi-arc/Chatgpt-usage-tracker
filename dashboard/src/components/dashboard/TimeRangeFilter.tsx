'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { TimeRange } from '@/lib/types';

const ranges: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24시간' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
];

export default function TimeRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get('range') || '7d') as TimeRange;

  function handleClick(range: TimeRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', range);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {ranges.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleClick(value)}
          className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
            current === value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
