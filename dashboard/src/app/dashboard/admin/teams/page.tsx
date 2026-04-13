'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { createTeam, deleteTeam, getAllTeams, getProfile, updateTeam } from '@/lib/queries';
import type { Team } from '@/lib/types';

export default function TeamsManagementPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const loadTeams = useCallback(async (client = supabase) => {
    setLoading(true);
    try {
      setTeams(await getAllTeams(client));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const client = createClient();

    async function checkAdminAndLoad() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const profile = await getProfile(client, user.id);
      setCanManage(profile?.role === 'admin');

      await loadTeams(client);
    }

    checkAdminAndLoad();
  }, [loadTeams, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!canManage) {
      setError('팀을 수정할 권한이 없습니다.');
      return;
    }
    if (!newName.trim()) return;

    try {
      await createTeam(supabase, newName.trim());
      setNewName('');
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : '팀 생성에 실패했습니다.');
      return;
    }
  }

  async function handleUpdate(id: string) {
    setError('');
    if (!canManage) {
      setError('팀을 수정할 권한이 없습니다.');
      return;
    }
    if (!editName.trim()) return;

    try {
      await updateTeam(supabase, id, editName.trim());
      setEditId(null);
      setEditName('');
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : '팀 수정에 실패했습니다.');
      return;
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!canManage) {
      setError('팀을 삭제할 권한이 없습니다.');
      return;
    }
    if (!confirm(`"${name}" 팀을 삭제하시겠습니까? 팀원의 팀 설정이 해제됩니다.`)) return;

    try {
      await deleteTeam(supabase, id);
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : '팀 삭제에 실패했습니다.');
      return;
    }
  }

  if (loading) {
    return <p className="text-gray-400 p-8">로딩 중...</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">팀 관리</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {canManage ? '팀 생성, 수정, 삭제' : '팀 목록 조회'}
        </p>
      </div>

      {!canManage && (
        <div className="p-3 text-sm text-amber-900 bg-amber-100 rounded-lg dark:bg-amber-900/30 dark:text-amber-200">
          현재 계정은 팀 목록만 볼 수 있습니다. 생성, 수정, 삭제는 관리자만 가능합니다.
        </div>
      )}

      {error && (
        <div className="p-3 text-sm text-white bg-red-500 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleCreate} className="flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="새 팀 이름"
          disabled={!canManage}
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!canManage}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
        >
          생성
        </button>
      </form>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {teams.map(team => (
          <div key={team.id} className="flex items-center justify-between px-4 py-3">
            {editId === team.id ? (
              <div className="flex gap-2 flex-1 mr-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!canManage}
                  className="flex-1 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white text-sm"
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(team.id)}
                  disabled={!canManage}
                  className="px-3 py-1 text-sm bg-emerald-500 text-white rounded-md"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setEditId(null);
                    setEditName('');
                  }}
                  className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 rounded-md"
                >
                  취소
                </button>
              </div>
            ) : (
              <>
                <span className="font-medium text-gray-900 dark:text-white">{team.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditId(team.id); setEditName(team.name); }}
                    disabled={!canManage}
                    className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(team.id, team.name)}
                    disabled={!canManage}
                    className="px-3 py-1 text-sm text-red-500 hover:text-red-700 rounded-md"
                  >
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {!teams.length && (
          <p className="px-4 py-6 text-center text-gray-400">팀이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
