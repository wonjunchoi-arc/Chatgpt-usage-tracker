'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  deleteProfileByAdmin,
  getAllProfilesWithTeams,
  getProfile,
  getAllTeams,
  updateProfileByAdmin,
} from '@/lib/queries';
import { getProfileDisplayName, type ProfileWithTeam, type Team } from '@/lib/types';

interface EditState {
  id: string;
  displayName: string;
  teamId: string;
  role: 'member' | 'admin';
}

export default function UsersManagementPage() {
  const [profiles, setProfiles] = useState<ProfileWithTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const loadData = useCallback(async (client = supabase) => {
    setLoading(true);
    try {
      const [nextProfiles, nextTeams] = await Promise.all([
        getAllProfilesWithTeams(client),
        getAllTeams(client),
      ]);
      setProfiles(nextProfiles);
      setTeams(nextTeams);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const client = createClient();

    async function loadCurrentUserAndData() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const profile = await getProfile(client, user.id);
      if (!profile) {
        router.push('/login');
        return;
      }

      setCanManage(profile.role === 'admin');
      setCurrentUserId(user.id);
      await loadData(client);
    }

    loadCurrentUserAndData();
  }, [loadData, router]);

  function startEdit(profile: ProfileWithTeam) {
    setEditState({
      id: profile.id,
      displayName: profile.display_name || '',
      teamId: profile.team_id || '',
      role: profile.role,
    });
    setError('');
  }

  async function handleSave() {
    if (!editState) return;
    if (!canManage) {
      setError('사용자 정보를 수정할 권한이 없습니다.');
      return;
    }

    try {
      await updateProfileByAdmin(supabase, editState.id, {
        display_name: editState.displayName.trim() || null,
        team_id: editState.teamId || null,
        role: editState.role,
      });
      setEditState(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 수정에 실패했습니다.');
    }
  }

  async function handleDelete(profile: ProfileWithTeam) {
    if (!canManage) {
      setError('사용자를 삭제할 권한이 없습니다.');
      return;
    }
    if (profile.id === currentUserId) {
      setError('현재 로그인한 계정은 삭제할 수 없습니다.');
      return;
    }
    if (!confirm(`"${getProfileDisplayName(profile)}" 사용자를 삭제하시겠습니까? 활동 기록도 함께 삭제됩니다.`)) {
      return;
    }

    try {
      await deleteProfileByAdmin(supabase, profile.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 삭제에 실패했습니다.');
    }
  }

  if (loading) {
    return <p className="text-gray-400 p-8">로딩 중...</p>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">사용자 관리</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {canManage ? '가입된 사용자 목록 조회, 이름·팀·권한 수정, 사용자 삭제' : '가입된 사용자 목록 조회'}
        </p>
      </div>

      <div className={`p-3 text-sm rounded-lg ${canManage ? 'text-blue-900 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200' : 'text-amber-900 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200'}`}>
        {canManage
          ? '관리자는 이 페이지에서 모든 사용자 정보를 수정할 수 있습니다. 사용자 삭제는 profiles와 연결된 활동 데이터도 함께 제거하며, Supabase Auth 계정 자체 삭제는 별도 서버 권한 작업이 필요합니다.'
          : '현재 계정은 사용자 목록만 볼 수 있습니다. 이름, 팀, 권한 수정과 삭제는 관리자만 가능합니다.'}
      </div>

      {error && (
        <div className="p-3 text-sm text-white bg-red-500 rounded-lg">{error}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">이름</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">이메일</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">팀</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">가입 경로</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">권한</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">가입일</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const isEditing = editState?.id === profile.id;

                return (
                  <tr key={profile.id} className="border-b border-gray-50 dark:border-gray-700/50 align-top">
                    <td className="px-4 py-3 min-w-40">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editState.displayName}
                          onChange={(e) => setEditState((prev) => prev ? { ...prev, displayName: e.target.value } : prev)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <div className="font-medium text-gray-900 dark:text-white">
                          {getProfileDisplayName(profile)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 min-w-56">{profile.email}</td>
                    <td className="px-4 py-3 min-w-44">
                      {isEditing ? (
                        <select
                          value={editState.teamId}
                          onChange={(e) => setEditState((prev) => prev ? { ...prev, teamId: e.target.value } : prev)}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">미지정</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-300">{profile.team_name || '미지정'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-32 text-gray-600 dark:text-gray-300">
                      {profile.signup_source === 'dashboard' ? '대시보드' : profile.signup_source === 'extension' ? '익스텐션' : '기타'}
                      {profile.is_bootstrap_admin ? ' · 초기 관리자' : ''}
                    </td>
                    <td className="px-4 py-3 min-w-28">
                      {isEditing ? (
                        <select
                          value={editState.role}
                          onChange={(e) => setEditState((prev) => prev ? { ...prev, role: e.target.value as 'member' | 'admin' } : prev)}
                          disabled={!canManage}
                          className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="member">멤버</option>
                          <option value="admin">관리자</option>
                        </select>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-300">{profile.role === 'admin' ? '관리자' : '멤버'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(profile.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSave}
                              disabled={!canManage}
                              className="px-3 py-1 text-sm bg-emerald-500 text-white rounded-md"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditState(null)}
                              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 rounded-md"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(profile)}
                              disabled={!canManage}
                              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(profile)}
                              disabled={!canManage || profile.id === currentUserId}
                              className="px-3 py-1 text-sm text-red-500 hover:text-red-700 disabled:opacity-50 rounded-md"
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!profiles.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    가입된 사용자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
