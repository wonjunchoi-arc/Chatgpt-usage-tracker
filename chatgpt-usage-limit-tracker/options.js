document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.getElementById('opt-auth-form');
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

  // ---- Tab switching ----

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      authMode = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === authMode));
      authBtn.textContent = authMode === 'signin' ? '로그인' : '회원가입';
      passwordInput.autocomplete = authMode === 'signin' ? 'current-password' : 'new-password';
      nameWrap.hidden = authMode !== 'signup';
      nameInput.required = authMode === 'signup';
      hideMessages();
    });
  });

  // ---- Helpers ----

  function hideMessages() {
    authError.hidden = true;
    teamError.hidden = true;
    teamSuccess.hidden = true;
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.hidden = false;
  }

  function showSuccess(el, msg) {
    el.textContent = msg;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 3000);
  }

  function formatTime(ts) {
    if (!ts) return '-';
    const d = new Date(ts);
    return d.toLocaleString('ko-KR');
  }

  // ---- UI state rendering ----

  async function renderAuthState() {
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
    } else {
      loggedOutSection.hidden = false;
      loggedInSection.hidden = true;
      teamSection.hidden = true;
      syncSection.hidden = true;
    }
  }

  async function renderTeamState(profile) {
    const { teamName } = await sbStorageGet(['teamName']);
    currentTeam.textContent = teamName || '미설정';

    try {
      const teams = await fetchTeams();
      teamSelect.innerHTML = '<option value="">-- 팀을 선택하세요 --</option>';
      teams.forEach(team => {
        const opt = document.createElement('option');
        opt.value = team.id;
        opt.textContent = team.name;
        if (profile && profile.team_id === team.id) opt.selected = true;
        teamSelect.appendChild(opt);
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

  // ---- Auth form submit ----

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
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

  // ---- Sign out ----

  signOutBtn.addEventListener('click', async () => {
    await signOut();
    await renderAuthState();
  });

  // ---- Team save ----

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
      showSuccess(teamSuccess, '팀이 저장되었습니다.');
      const profile = await getUserProfile();
      await renderTeamState(profile);
    } catch (err) {
      showError(teamError, err.message);
    } finally {
      teamBtn.disabled = false;
    }
  });

  // ---- Force sync ----

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

  // ---- Init ----

  renderAuthState();
});
