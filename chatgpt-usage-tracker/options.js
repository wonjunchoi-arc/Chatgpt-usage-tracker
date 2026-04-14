document.addEventListener('DOMContentLoaded', () => {
  const workspaceSection = document.getElementById('opt-workspace-section');
  const workspaceHint = document.getElementById('opt-workspace-hint');
  const workspaceCurrent = document.getElementById('opt-workspace-current');
  const workspaceName = document.getElementById('opt-workspace-name');
  const workspaceUrl = document.getElementById('opt-workspace-url');
  const workspaceSummary = document.getElementById('opt-workspace-summary');
  const workspaceBody = document.getElementById('opt-workspace-body');
  const workspaceToggle = document.getElementById('opt-workspace-toggle');
  const workspaceForm = document.getElementById('opt-workspace-form');
  const workspaceLabelInput = document.getElementById('opt-workspace-label');
  const workspaceUrlInput = document.getElementById('opt-supabase-url');
  const workspaceKeyInput = document.getElementById('opt-supabase-key');
  const workspaceSaveBtn = document.getElementById('opt-workspace-save-btn');
  const workspaceClearBtn = document.getElementById('opt-workspace-clear-btn');
  const workspaceError = document.getElementById('opt-workspace-error');
  const workspaceSuccess = document.getElementById('opt-workspace-success');

  const authForm = document.getElementById('opt-auth-form');
  const authSection = document.getElementById('opt-auth-section');
  const nameWrap = document.getElementById('opt-name-wrap');
  const nameInput = document.getElementById('opt-name');
  const emailInput = document.getElementById('opt-email');
  const passwordInput = document.getElementById('opt-password');
  const authBtn = document.getElementById('opt-auth-btn');
  const authError = document.getElementById('opt-auth-error');
  const loggedOutSection = document.getElementById('opt-logged-out');
  const loggedInSection = document.getElementById('opt-logged-in');
  const userName = document.getElementById('opt-user-name');
  const userEmail = document.getElementById('opt-user-email');
  const userRole = document.getElementById('opt-user-role');
  const signOutBtn = document.getElementById('opt-signout-btn');
  const teamSection = document.getElementById('opt-team-section');
  const teamSummary = document.getElementById('opt-team-summary');
  const teamBody = document.getElementById('opt-team-body');
  const teamToggle = document.getElementById('opt-team-toggle');
  const currentTeam = document.getElementById('opt-current-team');
  const teamSelect = document.getElementById('opt-team-select');
  const teamBtn = document.getElementById('opt-team-btn');
  const teamError = document.getElementById('opt-team-error');
  const teamSuccess = document.getElementById('opt-team-success');
  const syncSection = document.getElementById('opt-sync-section');
  const syncEnabled = document.getElementById('opt-sync-enabled');
  const lastSync = document.getElementById('opt-last-sync');
  const queueSize = document.getElementById('opt-queue-size');
  const forceSyncBtn = document.getElementById('opt-force-sync-btn');

  const tabs = Array.from(document.querySelectorAll('.opt-tab'));
  let authMode = 'signin';
  let workspaceCollapsed = null;
  let teamCollapsed = null;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      authMode = tab.dataset.tab;
      tabs.forEach(item => item.classList.toggle('is-active', item.dataset.tab === authMode));
      authBtn.textContent = authMode === 'signin' ? '로그인' : '회원가입';
      passwordInput.autocomplete = authMode === 'signin' ? 'current-password' : 'new-password';
      nameWrap.hidden = authMode !== 'signup';
      nameInput.required = authMode === 'signup';
      hideMessages();
    });
  });

  function hideMessages() {
    authError.hidden = true;
    teamError.hidden = true;
    teamSuccess.hidden = true;
    workspaceError.hidden = true;
    workspaceSuccess.hidden = true;
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.hidden = false;
  }

  function showSuccess(el, msg) {
    el.textContent = msg;
    el.hidden = false;
    setTimeout(() => {
      el.hidden = true;
    }, 3000);
  }

  function formatTime(ts) {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('ko-KR');
  }

  function setCollapsedState(sectionBody, toggleButton, collapsed) {
    sectionBody.classList.toggle('opt-card-body-collapsed', collapsed);
    toggleButton.textContent = collapsed ? '펼치기' : '접기';
    toggleButton.setAttribute('aria-expanded', String(!collapsed));
  }

  function updateWorkspaceCollapse(configured) {
    workspaceToggle.hidden = !configured;
    if (!configured) {
      workspaceCollapsed = false;
    } else if (workspaceCollapsed === null) {
      workspaceCollapsed = true;
    }
    setCollapsedState(workspaceBody, workspaceToggle, workspaceCollapsed);
  }

  function updateTeamCollapse(hasTeam) {
    teamToggle.hidden = !hasTeam;
    if (!hasTeam) {
      teamCollapsed = false;
    } else if (teamCollapsed === null) {
      teamCollapsed = true;
    }
    setCollapsedState(teamBody, teamToggle, teamCollapsed);
  }

  async function renderWorkspaceState() {
    const config = await getWorkspaceConfig();
    const configured = !!config;

    workspaceCurrent.hidden = !configured;
    workspaceClearBtn.hidden = !configured;
    authSection.hidden = !configured;

    if (!configured) {
      workspaceHint.textContent = '회사별 Supabase 정보를 먼저 연결해야 로그인과 동기화를 사용할 수 있습니다.';
      workspaceSummary.textContent = '회사별 Supabase 정보를 먼저 연결하세요.';
      workspaceLabelInput.value = '';
      workspaceUrlInput.value = '';
      workspaceKeyInput.value = '';
      loggedOutSection.hidden = false;
      loggedInSection.hidden = true;
      teamSection.hidden = true;
      syncSection.hidden = true;
      updateWorkspaceCollapse(false);
      return false;
    }

    workspaceHint.textContent = '연결을 바꾸면 현재 로그인 세션과 대기 중인 동기화 큐가 초기화됩니다.';
    workspaceName.textContent = config.workspaceName || '이름 미설정';
    workspaceUrl.textContent = config.supabaseUrl;
    workspaceSummary.textContent = `${config.workspaceName || '이름 미설정'} · 연결 완료`;
    workspaceLabelInput.value = config.workspaceName || '';
    workspaceUrlInput.value = config.supabaseUrl;
    workspaceKeyInput.value = config.supabaseAnonKey;
    updateWorkspaceCollapse(true);
    return true;
  }

  async function renderAuthState() {
    const configured = await renderWorkspaceState();
    if (!configured) return;

    const session = await getSession();
    if (session) {
      loggedOutSection.hidden = true;
      loggedInSection.hidden = false;
      teamSection.hidden = false;
      syncSection.hidden = false;

      const profile = await getUserProfile();
      userName.textContent = (profile && profile.display_name) || session.user.email;
      userEmail.textContent = session.user.email;
      userRole.textContent = profile && profile.role === 'admin' ? '관리자' : '멤버';

      await renderTeamState(profile);
      await renderSyncState();
      return;
    }

    loggedOutSection.hidden = false;
    loggedInSection.hidden = true;
    teamSection.hidden = true;
    syncSection.hidden = true;
  }

  async function renderTeamState(profile) {
    const { teamName } = await sbStorageGet(['teamName']);
    currentTeam.textContent = teamName || '미설정';
    teamSummary.textContent = teamName ? `${teamName} · 설정 완료` : '팀을 선택하면 대시보드 집계와 연결됩니다.';
    updateTeamCollapse(!!teamName);

    try {
      const teams = await fetchTeams();
      teamSelect.innerHTML = '<option value="">-- 팀을 선택하세요 --</option>';
      teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        if (profile && profile.team_id === team.id) option.selected = true;
        teamSelect.appendChild(option);
      });
    } catch (err) {
      showError(teamError, '팀 목록을 불러올 수 없습니다.');
    }
  }

  async function renderSyncState() {
    const status = await getSyncStatus();
    syncEnabled.textContent = status.syncEnabled ? '활성' : '비활성';
    lastSync.textContent = formatTime(status.lastSyncTimestamp);
    queueSize.textContent = `${status.queueSize}건`;
  }

  workspaceForm.addEventListener('submit', async event => {
    event.preventDefault();
    hideMessages();
    workspaceSaveBtn.disabled = true;

    try {
      await saveWorkspaceConfig({
        workspaceName: workspaceLabelInput.value,
        supabaseUrl: workspaceUrlInput.value,
        supabaseAnonKey: workspaceKeyInput.value,
      });
      workspaceCollapsed = true;
      showSuccess(workspaceSuccess, '회사 연결 정보가 저장되었습니다.');
      await renderAuthState();
    } catch (err) {
      showError(workspaceError, err.message);
    } finally {
      workspaceSaveBtn.disabled = false;
    }
  });

  workspaceToggle.addEventListener('click', () => {
    workspaceCollapsed = !workspaceCollapsed;
    updateWorkspaceCollapse(true);
  });

  workspaceClearBtn.addEventListener('click', async () => {
    hideMessages();
    workspaceClearBtn.disabled = true;
    try {
      await clearWorkspaceConfig();
      showSuccess(workspaceSuccess, '회사 연결이 해제되었습니다.');
      await renderAuthState();
    } catch (err) {
      showError(workspaceError, err.message);
    } finally {
      workspaceClearBtn.disabled = false;
    }
  });

  teamToggle.addEventListener('click', () => {
    teamCollapsed = !teamCollapsed;
    updateTeamCollapse(currentTeam.textContent !== '미설정');
  });

  authForm.addEventListener('submit', async event => {
    event.preventDefault();
    hideMessages();
    authBtn.disabled = true;

    const email = emailInput.value.trim();
    const name = nameInput.value.trim();
    const password = passwordInput.value;

    try {
      if (authMode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
      await renderAuthState();
    } catch (err) {
      showError(authError, err.message);
    } finally {
      authBtn.disabled = false;
    }
  });

  signOutBtn.addEventListener('click', async () => {
    await signOut();
    await renderAuthState();
  });

  teamBtn.addEventListener('click', async () => {
    hideMessages();
    const teamId = teamSelect.value;
    if (!teamId) {
      showError(teamError, '팀을 선택하세요.');
      return;
    }

    teamBtn.disabled = true;
    try {
      await setUserTeam(teamId);
      teamCollapsed = true;
      showSuccess(teamSuccess, '팀이 저장되었습니다.');
      const profile = await getUserProfile();
      await renderTeamState(profile);
    } catch (err) {
      showError(teamError, err.message);
    } finally {
      teamBtn.disabled = false;
    }
  });

  forceSyncBtn.addEventListener('click', async () => {
    forceSyncBtn.disabled = true;
    forceSyncBtn.textContent = '동기화 중...';
    try {
      await flushSyncQueue();
    } catch (err) {
      console.warn('Manual sync failed:', err);
    }
    await renderSyncState();
    forceSyncBtn.textContent = '수동 동기화';
    forceSyncBtn.disabled = false;
  });

  renderAuthState();
});
