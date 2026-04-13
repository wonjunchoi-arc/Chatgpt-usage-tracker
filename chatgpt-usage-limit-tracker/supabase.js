// ============================================================
// Supabase REST helpers (no SDK dependency)
// ============================================================

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

const AUTH_URL = `${SUPABASE_URL}/auth/v1`;
const REST_URL = `${SUPABASE_URL}/rest/v1`;

const SYNC_QUEUE_MAX = 500;
const SYNC_BATCH_SIZE = 50;
const MAX_RETRY_COUNT = 5;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

// ---- Storage helpers ----

function sbStorageGet(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

function sbStorageSet(data) {
  return new Promise(resolve => chrome.storage.local.set(data, resolve));
}

// ---- Session management ----

async function getSession() {
  const { supabaseSession } = await sbStorageGet(['supabaseSession']);
  return supabaseSession || null;
}

async function saveSession(session) {
  await sbStorageSet({
    supabaseSession: session,
    syncEnabled: !!session
  });
}

async function clearSession() {
  await sbStorageSet({
    supabaseSession: null,
    syncEnabled: false,
    teamId: null,
    teamName: null
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
      email: data.user.email
    }
  };
}

// ---- Auth ----

async function signUp(email, password, displayName = '') {
  const resp = await fetch(`${AUTH_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      email,
      password,
      options: {
        emailRedirectTo: `${SUPABASE_URL}/auth/v1/callback`,
        data: {
          display_name: displayName.trim() || null
        }
      }
    })
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
  const resp = await fetch(`${AUTH_URL}/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ email, password })
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
  const session = await getSession();
  if (session) {
    await fetch(`${AUTH_URL}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY
      }
    }).catch(() => {});
  }
  await clearSession();
}

async function refreshSession() {
  const session = await getSession();
  if (!session || !session.refresh_token) {
    await clearSession();
    return null;
  }

  const resp = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ refresh_token: session.refresh_token })
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
  let session = await getSession();
  if (!session) return null;

  if (Date.now() >= session.expires_at - TOKEN_REFRESH_MARGIN_MS) {
    session = await refreshSession();
  }
  return session;
}

// ---- REST helpers ----

function restHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken}`,
    'Prefer': 'return=minimal'
  };
}

async function restGet(path, accessToken) {
  const resp = await fetch(`${REST_URL}${path}`, {
    headers: restHeaders(accessToken)
  });
  if (!resp.ok) throw new Error(`GET ${path} failed (${resp.status})`);
  return resp.json();
}

async function restPost(path, body, accessToken) {
  const headers = restHeaders(accessToken);
  headers['Prefer'] = 'resolution=ignore-duplicates, return=minimal';
  const resp = await fetch(`${REST_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!resp.ok && resp.status !== 409) {
    throw new Error(`POST ${path} failed (${resp.status})`);
  }
}

async function restPatch(path, body, accessToken) {
  const resp = await fetch(`${REST_URL}${path}`, {
    method: 'PATCH',
    headers: restHeaders(accessToken),
    body: JSON.stringify(body)
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

  await restPatch(
    `/profiles?id=eq.${session.user.id}`,
    { team_id: teamId },
    session.access_token
  );

  const teams = await fetchTeams();
  const team = teams.find(t => t.id === teamId);
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
  const timestamps = [];
  const failed = [];

  for (const item of syncQueue) {
    if (item.type === 'event') events.push(item);
    else if (item.type === 'timestamp') timestamps.push(item);
  }

  // Send events in batches
  for (let i = 0; i < events.length; i += SYNC_BATCH_SIZE) {
    const batch = events.slice(i, i + SYNC_BATCH_SIZE);
    const rows = batch.map(item => ({
      user_id: session.user.id,
      ts: item.data.ts,
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
      path: item.data.path || null
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

  // Send timestamps in batches
  for (let i = 0; i < timestamps.length; i += SYNC_BATCH_SIZE) {
    const batch = timestamps.slice(i, i + SYNC_BATCH_SIZE);
    const rows = batch.map(item => ({
      user_id: session.user.id,
      model_id: item.data.modelId,
      ts: item.data.ts
    }));

    try {
      await restPost('/model_timestamps', rows, session.access_token);
    } catch (err) {
      console.warn('Sync timestamps batch failed:', err);
      for (const item of batch) {
        item.retryCount = (item.retryCount || 0) + 1;
        if (item.retryCount < MAX_RETRY_COUNT) failed.push(item);
      }
    }
  }

  await sbStorageSet({
    syncQueue: failed,
    lastSyncTimestamp: Date.now()
  });
}

async function getSyncStatus() {
  const { syncEnabled, lastSyncTimestamp, syncQueue = [], supabaseSession, teamName } =
    await sbStorageGet(['syncEnabled', 'lastSyncTimestamp', 'syncQueue', 'supabaseSession', 'teamName']);
  return {
    loggedIn: !!(supabaseSession && supabaseSession.access_token),
    email: supabaseSession ? supabaseSession.user.email : null,
    syncEnabled: !!syncEnabled,
    lastSyncTimestamp: lastSyncTimestamp || null,
    queueSize: syncQueue.length,
    teamName: teamName || null
  };
}
