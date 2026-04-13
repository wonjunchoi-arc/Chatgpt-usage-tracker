'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentMonthKey, type MonthKey } from '@/lib/types';

function getMonthOptions(): { value: MonthKey; label: string }[] {
  const options: { value: MonthKey; label: string }[] = [];
  const now = new Date();

  for (let index = 0; index < 3; index += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    const value = getCurrentMonthKey(date);
    const [year, month] = value.split('-');
    options.push({ value, label: `${year}.${month}` });
  }

  return options;
}

export default function TimeRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get('month') || getCurrentMonthKey()) as MonthKey;
  const months = getMonthOptions();

  function handleClick(month: MonthKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', month);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {months.map(({ value, label }) => (
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
