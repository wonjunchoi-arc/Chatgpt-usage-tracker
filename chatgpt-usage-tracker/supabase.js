// ============================================================
// Supabase REST helpers backed by extension-local workspace config
// ============================================================

const SYNC_QUEUE_MAX = 500;
const SYNC_BATCH_SIZE = 50;
const MAX_RETRY_COUNT = 5;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

const WORKSPACE_CONFIG_KEYS = [
  'workspaceSupabaseUrl',
  'workspaceSupabaseAnonKey',
  'workspaceName',
];

function sbStorageGet(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

function sbStorageSet(data) {
  return new Promise(resolve => chrome.storage.local.set(data, resolve));
}

function normalizeSupabaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function normalizeWorkspaceName(value) {
  return String(value || '').trim();
}

function normalizeAnonKey(value) {
  return String(value || '').trim();
}

function validateWorkspaceConfig({ supabaseUrl, supabaseAnonKey }) {
  if (!supabaseUrl) {
    throw new Error('Supabase URL을 입력하세요.');
  }

  let parsed;
  try {
    parsed = new URL(supabaseUrl);
  } catch {
    throw new Error('Supabase URL 형식이 올바르지 않습니다.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Supabase URL은 https:// 로 시작해야 합니다.');
  }

  if (!supabaseAnonKey) {
    throw new Error('Supabase anon key를 입력하세요.');
  }
}

async function getWorkspaceConfig() {
  const items = await sbStorageGet(WORKSPACE_CONFIG_KEYS);
  const supabaseUrl = normalizeSupabaseUrl(items.workspaceSupabaseUrl);
  const supabaseAnonKey = normalizeAnonKey(items.workspaceSupabaseAnonKey);
  const workspaceName = normalizeWorkspaceName(items.workspaceName);

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    workspaceName,
    authUrl: `${supabaseUrl}/auth/v1`,
    restUrl: `${supabaseUrl}/rest/v1`,
  };
}

async function saveWorkspaceConfig({ supabaseUrl, supabaseAnonKey, workspaceName }) {
  const previousConfig = await getWorkspaceConfig();
  const nextConfig = {
    supabaseUrl: normalizeSupabaseUrl(supabaseUrl),
    supabaseAnonKey: normalizeAnonKey(supabaseAnonKey),
    workspaceName: normalizeWorkspaceName(workspaceName),
  };

  validateWorkspaceConfig(nextConfig);

  const shouldResetConnectionState =
    !previousConfig ||
    previousConfig.supabaseUrl !== nextConfig.supabaseUrl ||
    previousConfig.supabaseAnonKey !== nextConfig.supabaseAnonKey;

  const payload = {
    workspaceSupabaseUrl: nextConfig.supabaseUrl,
    workspaceSupabaseAnonKey: nextConfig.supabaseAnonKey,
    workspaceName: nextConfig.workspaceName || null,
  };

  if (shouldResetConnectionState) {
    payload.supabaseSession = null;
    payload.syncEnabled = false;
    payload.teamId = null;
    payload.teamName = null;
    payload.lastSyncTimestamp = null;
    payload.syncQueue = [];
  }

  await sbStorageSet(payload);

  return getWorkspaceConfig();
}

async function clearWorkspaceConfig() {
  await sbStorageSet({
    workspaceSupabaseUrl: null,
    workspaceSupabaseAnonKey: null,
    workspaceName: null,
    supabaseSession: null,
    syncEnabled: false,
    teamId: null,
    teamName: null,
    lastSyncTimestamp: null,
    syncQueue: [],
  });
}

async function requireWorkspaceConfig() {
  const config = await getWorkspaceConfig();
  if (!config) {
    throw new Error('먼저 회사 연결 정보를 설정하세요.');
  }
  return config;
}

// ---- Session management ----

async function getSession() {
  const { supabaseSession } = await sbStorageGet(['supabaseSession']);
  return supabaseSession || null;
}

async function saveSession(session) {
  await sbStorageSet({
    supabaseSession: session,
    syncEnabled: !!session,
  });
}

async function clearSession() {
  await sbStorageSet({
    supabaseSession: null,
    syncEnabled: false,
    teamId: null,
    teamName: null,
  });
}

function parseAuthResponse(data) {
  if (!data || !data.access_token) return null;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  };
}

// ---- Auth ----

async function signUp(email, password, displayName = '') {
  const config = await requireWorkspaceConfig();
  const resp = await fetch(`${config.authUrl}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.supabaseAnonKey,
    },
    body: JSON.stringify({
      email,
      password,
      data: {
        display_name: displayName.trim() || null,
        signup_source: 'extension',
      },
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.msg || err.error_description || `Sign up failed (${resp.status})`);
  }

  const data = await resp.json();
  const session = parseAuthResponse(data);
  if (session) await saveSession(session);
  return session;
}

async function signIn(email, password) {
  const config = await requireWorkspaceConfig();
  const resp = await fetch(`${config.authUrl}/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.supabaseAnonKey,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.msg || err.error_description || `Sign in failed (${resp.status})`);
  }

  const data = await resp.json();
  const session = parseAuthResponse(data);
  if (session) await saveSession(session);
  return session;
}

async function signOut() {
  const config = await getWorkspaceConfig();
  const session = await getSession();
  if (config && session) {
    await fetch(`${config.authUrl}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': config.supabaseAnonKey,
      },
    }).catch(() => {});
  }
  await clearSession();
}

async function refreshSession() {
  const config = await getWorkspaceConfig();
  const session = await getSession();
  if (!config || !session || !session.refresh_token) {
    await clearSession();
    return null;
  }

  const resp = await fetch(`${config.authUrl}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.supabaseAnonKey,
    },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  if (!resp.ok) {
    await clearSession();
    return null;
  }

  const data = await resp.json();
  const refreshed = parseAuthResponse(data);
  if (refreshed) await saveSession(refreshed);
  return refreshed;
}

async function ensureValidSession() {
  const config = await getWorkspaceConfig();
  let session = await getSession();
  if (!config || !session) return null;

  if (Date.now() >= session.expires_at - TOKEN_REFRESH_MARGIN_MS) {
    session = await refreshSession();
  }
  return session;
}

// ---- REST helpers ----

function restHeaders(accessToken, apikey) {
  return {
    'Content-Type': 'application/json',
    'apikey': apikey,
    'Authorization': `Bearer ${accessToken}`,
    'Prefer': 'return=minimal',
  };
}

async function restGet(path, accessToken) {
  const config = await requireWorkspaceConfig();
  const resp = await fetch(`${config.restUrl}${path}`, {
    headers: restHeaders(accessToken, config.supabaseAnonKey),
  });
  if (!resp.ok) throw new Error(`GET ${path} failed (${resp.status})`);
  return resp.json();
}

async function restPost(path, body, accessToken) {
  const config = await requireWorkspaceConfig();
  const headers = restHeaders(accessToken, config.supabaseAnonKey);
  headers.Prefer = 'resolution=ignore-duplicates, return=minimal';
  const resp = await fetch(`${config.restUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok && resp.status !== 409) {
    throw new Error(`POST ${path} failed (${resp.status})`);
  }
}

async function restPatch(path, body, accessToken) {
  const config = await requireWorkspaceConfig();
  const resp = await fetch(`${config.restUrl}${path}`, {
    method: 'PATCH',
    headers: restHeaders(accessToken, config.supabaseAnonKey),
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`PATCH ${path} failed (${resp.status})`);
}

// ---- Teams & Profile ----

async function fetchTeams() {
  const session = await ensureValidSession();
  if (!session) return [];
  return restGet('/teams?select=id,name&order=name', session.access_token);
}

async function setUserTeam(teamId) {
  const session = await ensureValidSession();
  if (!session) throw new Error('Not authenticated');

  await restPost(
    '/rpc/set_own_team',
    { p_team_id: teamId },
    session.access_token
  );

  const teams = await fetchTeams();
  const team = teams.find(item => item.id === teamId);
  await sbStorageSet({ teamId, teamName: team ? team.name : '' });
}

async function getUserProfile() {
  const session = await ensureValidSession();
  if (!session) return null;
  const rows = await restGet(
    `/profiles?id=eq.${session.user.id}&select=id,email,display_name,team_id,role`,
    session.access_token
  );
  return rows[0] || null;
}

// ---- Sync Queue ----

async function appendToSyncQueue(item) {
  const { syncQueue = [], syncEnabled } = await sbStorageGet(['syncQueue', 'syncEnabled']);
  if (!syncEnabled) return;

  const next = [...syncQueue, item].slice(-SYNC_QUEUE_MAX);
  await sbStorageSet({ syncQueue: next });
}

async function flushSyncQueue() {
  const { syncEnabled } = await sbStorageGet(['syncEnabled']);
  if (!syncEnabled) return;

  const session = await ensureValidSession();
  if (!session) return;

  const { syncQueue = [] } = await sbStorageGet(['syncQueue']);
  if (!syncQueue.length) return;

  const events = [];
  const failed = [];

  for (const item of syncQueue) {
    if (item.type === 'event') events.push(item);
  }

  for (let index = 0; index < events.length; index += SYNC_BATCH_SIZE) {
    const batch = events.slice(index, index + SYNC_BATCH_SIZE);
    const rows = batch.map(item => ({
      user_id: session.user.id,
      ts: item.data.ts,
      month_key: item.data.monthKey,
      model_id: item.data.modelId,
      display_name: item.data.displayName || null,
      app: item.data.app,
      features: item.data.features || [],
      attachment_count: item.data.attachmentCount || 0,
      attachment_mime_types: item.data.attachmentMimeTypes || [],
      attachment_sources: item.data.attachmentSources || [],
      image_count: item.data.imageCount || 0,
      tool_count: item.data.toolCount || 0,
      tool_names: item.data.toolNames || [],
      skill_ids: item.data.skillIds || [],
      skill_count: item.data.skillCount || 0,
      connector_ids: item.data.connectorIds || [],
      connector_count: item.data.connectorCount || 0,
      has_connector_mention: item.data.hasConnectorMention || false,
      source_count: item.data.sourceCount || 0,
      github_repo_count: item.data.githubRepoCount || 0,
      selected_all_github_repos: item.data.selectedAllGithubRepos || false,
      system_hints: item.data.systemHints || [],
      conversation_mode: item.data.conversationMode || null,
      gizmo_id: item.data.gizmoId || null,
      thinking_effort: item.data.thinkingEffort || null,
      model_tier: item.data.modelTier || 'standard',
      path: item.data.path || null,
    }));

    try {
      await restPost('/activity_events', rows, session.access_token);
    } catch (err) {
      console.warn('Sync events batch failed:', err);
      for (const item of batch) {
        item.retryCount = (item.retryCount || 0) + 1;
        if (item.retryCount < MAX_RETRY_COUNT) failed.push(item);
      }
    }
  }

  await sbStorageSet({
    syncQueue: failed,
    lastSyncTimestamp: Date.now(),
  });
}

async function getSyncStatus() {
  const config = await getWorkspaceConfig();
  const { syncEnabled, lastSyncTimestamp, syncQueue = [], supabaseSession, teamName } =
    await sbStorageGet(['syncEnabled', 'lastSyncTimestamp', 'syncQueue', 'supabaseSession', 'teamName']);

  return {
    configured: !!config,
    workspaceName: config ? config.workspaceName || null : null,
    workspaceSupabaseUrl: config ? config.supabaseUrl : null,
    loggedIn: !!(supabaseSession && supabaseSession.access_token),
    email: supabaseSession ? supabaseSession.user.email : null,
    syncEnabled: !!syncEnabled,
    lastSyncTimestamp: lastSyncTimestamp || null,
    queueSize: syncQueue.length,
    teamName: teamName || null,
  };
}
