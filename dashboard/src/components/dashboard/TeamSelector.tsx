'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Team } from '@/lib/types';

interface Props {
  teams: Team[];
  selectedId: string;
}

export default function TeamSelector({ teams, selectedId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('teamId', e.target.value);
    router.push(`/dashboard/team?${params.toString()}`);
  }

  return (
    <select
      value={selectedId}
      onChange={handleChange}
      className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      {teams.map(team => (
        <option key={team.id} value={team.id}>{team.name}</option>
      ))}
    </select>
  );
}
