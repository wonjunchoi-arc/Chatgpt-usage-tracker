importScripts('supabase.js');

const DEBUG = true;
const CACHE_DURATION_MS = 60 * 60 * 1000;
const ACTIVITY_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const ACTIVITY_SUMMARY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVITY_EVENTS = 60;

const EMPTY_QUOTA = {
  models: [],
  free: [],
  plus: [],
  business: [],
  pro: []
};

const LEGACY_PLAN_ALIASES = {
  team: 'business'
};

const LEGACY_TIMESTAMP_KEYS = {
  'gpt-5.3-instant': ['timestamps_auto', 'timestamps_gpt-5', 'timestamps_gpt-5.2-auto'],
  'gpt-5.4-thinking': ['timestamps_gpt-5-thinking', 'timestamps_gpt-5.2-thinking'],
  'gpt-5.4-pro': ['timestamps_gpt-5-pro', 'timestamps_gpt-5.2-pro']
};

const SKIPPED_CONTENT_KEYS = new Set([
  'content',
  'contents',
  'text',
  'prompt',
  'instructions',
  'messages',
  'parts',
  'input',
  'output',
  'transcript',
  'conversation'
]);

const METADATA_VALUE_KEYS = new Set([
  'type',
  'kind',
  'mode',
  'recipient',
  'source',
  'channel',
  'endpoint',
  'feature',
  'tool',
  'tool_name',
  'toolname',
  'name'
]);

const FEATURE_RULES = [
  { pattern: /search|browse|web/, feature: 'search' },
  { pattern: /canvas/, feature: 'canvas' },
  { pattern: /data[_-]?analysis|python|code[_-]?interpreter|spreadsheet|table/, feature: 'data-analysis' },
  { pattern: /file|upload|document|attachment/, feature: 'file-analysis' },
  { pattern: /image[_-]?analysis|vision/, feature: 'image-analysis' },
  { pattern: /image[_-]?(gen|generation)|create[_-]?image|dall/, feature: 'image-generation' },
  { pattern: /memory/, feature: 'memory' },
  { pattern: /voice|audio/, feature: 'voice' },
  { pattern: /custom[_-]?instructions/, feature: 'custom-instructions' }
];

function storageGet(keys) {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, resolve);
  });
}

function storageSet(value) {
  return new Promise(resolve => {
    chrome.storage.local.set(value, resolve);
  });
}

function normalizePlan(plan) {
  return LEGACY_PLAN_ALIASES[plan] || plan || 'plus';
}

async function readStoredCache() {
  const items = await storageGet(['cachedQuotaAll', 'lastFetchTimestamp', 'activePlan']);
  return {
    cachedQuotaAll: items.cachedQuotaAll || null,
    lastFetchTimestamp: items.lastFetchTimestamp || 0,
    activePlan: normalizePlan(items.activePlan || 'plus')
  };
}

function writeStoredCache(quotaAll, timestamp) {
  return storageSet({
    cachedQuotaAll: quotaAll,
    lastFetchTimestamp: timestamp
  });
}

async function getActivePlan() {
  const { activePlan } = await readStoredCache();
  return normalizePlan(activePlan);
}

function setActivePlan(plan) {
  return storageSet({ activePlan: normalizePlan(plan) });
}

function normalizeQuotaShape(raw) {
  if (!raw) return EMPTY_QUOTA;

  if (Array.isArray(raw)) {
    return { ...EMPTY_QUOTA, models: raw, plus: raw };
  }

  const business = raw.business || raw.team || [];

  if (raw.free || raw.plus || raw.business || raw.team || raw.pro) {
    return {
      models: raw.models && raw.models.length ? raw.models : (raw.plus || []),
      free: raw.free || [],
      plus: raw.plus || raw.models || [],
      business,
      pro: raw.pro || []
    };
  }

  if (raw.models) {
    return { ...EMPTY_QUOTA, models: raw.models, plus: raw.models };
  }

  return EMPTY_QUOTA;
}

async function fetchQuotaAll() {
  const sourceUrl = DEBUG ? chrome.runtime.getURL('quota.json') : QUOTA_DATA_URL;
  const now = Date.now();
  const { cachedQuotaAll, lastFetchTimestamp } = await readStoredCache();

  if (cachedQuotaAll && now - lastFetchTimestamp < CACHE_DURATION_MS) {
    return cachedQuotaAll;
  }

  async function loadFrom(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Fetch failed ${resp.status}`);
    return normalizeQuotaShape(await resp.json());
  }

  try {
    const normalized = await loadFrom(sourceUrl);
    await writeStoredCache(normalized, now);
    return normalized;
  } catch (err) {
    console.error('Quota fetch failed, falling back to local quota.json', err);
    try {
      const fallback = await loadFrom(chrome.runtime.getURL('quota.json'));
      await writeStoredCache(fallback, now);
      return fallback;
    } catch (fallbackErr) {
      console.error('CRITICAL: local quota.json failed too', fallbackErr);
      return EMPTY_QUOTA;
    }
  }
}

function normalizeModelSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[._\s]+/g, '-');
}

function dedupeModels(models) {
  const dedup = new Map();
  for (const model of models || []) {
    if (model && model.id && !dedup.has(model.id)) {
      dedup.set(model.id, model);
    }
  }
  return Array.from(dedup.values());
}

async function getModelCatalog() {
  const all = await fetchQuotaAll();
  return dedupeModels([
    ...(all.models || []),
    ...(all.free || []),
    ...(all.plus || []),
    ...(all.business || []),
    ...(all.pro || [])
  ]);
}

async function getModelCatalogMap() {
  const catalog = await getModelCatalog();
  return new Map(catalog.map(model => [model.id, model]));
}

function getModelAliases(model) {
  return [model.id, ...(model.aliases || [])]
    .filter(Boolean)
    .map(normalizeModelSlug);
}

async function mapApiModelToId(apiModelSlug) {
  const normalizedSlug = normalizeModelSlug(apiModelSlug);
  if (!normalizedSlug) return null;

  const known = await getModelCatalog();

  for (const model of known) {
    if (getModelAliases(model).includes(normalizedSlug)) {
      return model.id;
    }
  }

  const sorted = [...known].sort((a, b) => b.id.length - a.id.length);
  for (const model of sorted) {
    for (const alias of getModelAliases(model)) {
      if (normalizedSlug.includes(alias)) {
        return model.id;
      }
    }
  }

  console.warn(`No matching model found for API slug: ${apiModelSlug}`);
  return null;
}

function extractCount(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return 1;
  return value ? 1 : 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).filter(value => typeof value === 'string' && value)));
}

function applyFeatureSignal(rawValue, features) {
  const value = normalizeModelSlug(rawValue);
  if (!value) return;
  for (const rule of FEATURE_RULES) {
    if (rule.pattern.test(value)) {
      features.add(rule.feature);
    }
  }
}

function getMessageMetadataEntries(body) {
  return asArray(body.messages)
    .map(message => message && message.metadata)
    .filter(Boolean);
}

function collectAttachments(metadataEntries) {
  return metadataEntries.flatMap(metadata => asArray(metadata.attachments));
}

function collectSystemHints(body, metadataEntries) {
  return uniqueStrings([
    ...asArray(body.system_hints),
    ...metadataEntries.flatMap(metadata => asArray(metadata.system_hints))
  ]);
}

function collectHazelnuts(metadataEntries) {
  return uniqueStrings(
    metadataEntries.flatMap(metadata => asArray(metadata.selected_hazelnuts))
  );
}

function collectConnectorIds(metadataEntries) {
  const directIds = metadataEntries.flatMap(metadata => [
    ...asArray(metadata.selected_connector_ids),
    ...asArray(metadata.developer_mode_connector_ids)
  ]);

  const hintedIds = metadataEntries
    .flatMap(metadata => asArray(metadata.system_hints))
    .concat(asArray(metadataEntries.length ? [] : []))
    .filter(hint => typeof hint === 'string' && hint.startsWith('connector:'))
    .map(hint => hint.slice('connector:'.length));

  return uniqueStrings([...directIds, ...hintedIds]);
}

function hasEcosystemMention(metadataEntries) {
  return metadataEntries.some(metadata =>
    asArray(metadata.serialization_metadata && metadata.serialization_metadata.custom_symbol_offsets)
      .some(offset => offset && offset.symbol === 'ecosystemMention')
  );
}

function walkMetadata(node, state, depth = 0) {
  if (depth > 6 || node == null) return;

  if (Array.isArray(node)) {
    for (const item of node.slice(0, 20)) {
      walkMetadata(item, state, depth + 1);
    }
    return;
  }

  if (typeof node !== 'object') {
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    const keyLower = key.toLowerCase();

    if (/attachment|upload|file/.test(keyLower)) {
      state.attachmentCount += extractCount(value);
      state.features.add('file-analysis');
    }

    if (/image|photo|picture/.test(keyLower)) {
      state.imageCount += extractCount(value);
      state.features.add('image-analysis');
    }

    applyFeatureSignal(keyLower, state.features);

    if (METADATA_VALUE_KEYS.has(keyLower) && typeof value === 'string') {
      applyFeatureSignal(value, state.features);
      if (keyLower.includes('tool') || keyLower === 'recipient') {
        state.toolNames.add(value);
      }
    }

    if (keyLower === 'tools' && Array.isArray(value)) {
      for (const tool of value.slice(0, 10)) {
        if (tool && typeof tool === 'object') {
          const name = tool.name || tool.type || tool.tool_name;
          if (typeof name === 'string') {
            state.toolNames.add(name);
            applyFeatureSignal(name, state.features);
          }
        }
      }
    }

    if (SKIPPED_CONTENT_KEYS.has(keyLower)) {
      continue;
    }

    if (value && typeof value === 'object') {
      walkMetadata(value, state, depth + 1);
    }
  }
}

function inferActivity(body, url) {
  const metadataEntries = getMessageMetadataEntries(body);
  const attachments = collectAttachments(metadataEntries);
  const systemHints = collectSystemHints(body, metadataEntries);
  const connectorIds = uniqueStrings([
    ...collectConnectorIds(metadataEntries),
    ...systemHints
      .filter(hint => typeof hint === 'string' && hint.startsWith('connector:'))
      .map(hint => hint.slice('connector:'.length))
  ]);
  const hazelnuts = collectHazelnuts(metadataEntries);
  const selectedSources = uniqueStrings(metadataEntries.flatMap(metadata => asArray(metadata.selected_sources)));
  const selectedGithubRepos = uniqueStrings(metadataEntries.flatMap(metadata => asArray(metadata.selected_github_repos)));
  const selectedSyncKnowledgeStoreIds = uniqueStrings(
    metadataEntries.flatMap(metadata => asArray(metadata.selected_sync_knowledge_store_ids))
  );
  const selectedAllGithubRepos = metadataEntries.some(metadata => metadata.selected_all_github_repos === true);
  const hasConnectorMention = hasEcosystemMention(metadataEntries);
  const conversationMode = body.conversation_mode && body.conversation_mode.kind;
  const gizmoId = body.conversation_mode && body.conversation_mode.gizmo_id;
  const thinkingEffort = typeof body.thinking_effort === 'string' ? body.thinking_effort : null;
  const modelTier = normalizeModelSlug(body.model).endsWith('-pro')
    ? 'pro'
    : (normalizeModelSlug(body.model).includes('thinking') ? 'thinking' : 'standard');

  const state = {
    features: new Set(),
    attachmentCount: 0,
    imageCount: 0,
    toolNames: new Set()
  };

  walkMetadata(body, state);
  applyFeatureSignal(url, state.features);
  systemHints.forEach(hint => applyFeatureSignal(hint, state.features));
  if (thinkingEffort) {
    applyFeatureSignal(thinkingEffort, state.features);
  }

  const attachmentMimeTypes = uniqueStrings(attachments.map(attachment => attachment && attachment.mime_type));
  const attachmentSources = uniqueStrings(attachments.map(attachment => attachment && attachment.source));
  if (attachments.length) {
    state.attachmentCount = attachments.length;
    state.features.add('file-analysis');
  }

  if (systemHints.includes('canvas')) {
    state.features.add('canvas');
  }
  if (connectorIds.length || hasConnectorMention) {
    state.features.add('connector-app');
  }
  if (hazelnuts.length) {
    state.features.add('skill-invocation');
  }
  if (conversationMode === 'gizmo_interaction') {
    state.features.add('project-context');
  }
  if (selectedSources.length || selectedSyncKnowledgeStoreIds.length) {
    state.features.add('source-context');
  }
  if (selectedGithubRepos.length || selectedAllGithubRepos) {
    state.features.add('github-context');
  }
  if (modelTier === 'pro') {
    state.features.add('pro-model');
  }

  const features = Array.from(state.features);
  let app = 'chat';

  // Priority order matches the document's classification rules
  if (connectorIds.length || hasConnectorMention) {
    app = 'connector';
  } else if (hazelnuts.length) {
    app = 'skill';
  } else if (features.includes('canvas')) {
    app = 'canvas';
  } else if (conversationMode === 'gizmo_interaction') {
    app = 'project';
  } else if (features.includes('image-generation')) {
    app = 'images';
  } else if (features.includes('voice')) {
    app = 'voice';
  } else if (
    features.includes('data-analysis') ||
    features.includes('file-analysis') ||
    features.includes('source-context') ||
    features.includes('github-context')
  ) {
    app = 'workspace';
  }

  return {
    app,
    features,
    attachmentCount: state.attachmentCount,
    attachmentMimeTypes,
    attachmentSources,
    imageCount: state.imageCount,
    toolNames: Array.from(state.toolNames).slice(0, 5),
    toolCount: state.toolNames.size,
    skillIds: hazelnuts,
    skillCount: hazelnuts.length,
    connectorIds,
    connectorCount: connectorIds.length,
    hasConnectorMention,
    sourceCount: selectedSources.length + selectedSyncKnowledgeStoreIds.length,
    githubRepoCount: selectedGithubRepos.length,
    selectedAllGithubRepos,
    systemHints,
    conversationMode: conversationMode || null,
    gizmoId: gizmoId || null,
    thinkingEffort,
    modelTier
  };
}

async function appendActivityEvent(event) {
  const { activityEvents = [] } = await storageGet(['activityEvents']);
  const cutoff = Date.now() - ACTIVITY_RETENTION_MS;
  const next = [event, ...activityEvents]
    .filter(item => item && item.ts >= cutoff)
    .slice(0, MAX_ACTIVITY_EVENTS);
  await storageSet({ activityEvents: next });
}

function getTimestampKeysForModel(modelId) {
  return [`timestamps_${modelId}`, ...(LEGACY_TIMESTAMP_KEYS[modelId] || [])];
}

function mergePlanRowWithCatalog(row, catalogMap) {
  const catalog = catalogMap.get(row.id) || {};
  return {
    ...catalog,
    ...row,
    displayName: row.displayName || catalog.displayName || row.id,
    capabilities: row.capabilities || catalog.capabilities || []
  };
}

async function getQuotaForPlan(planOverride = null) {
  const plan = normalizePlan(planOverride || await getActivePlan());
  const all = await fetchQuotaAll();
  const map = {
    free: all.free,
    plus: all.plus || all.models,
    business: all.business,
    pro: all.pro
  };
  return map[plan] || all.plus || all.models || [];
}

function countRecentTimestamps(result, model, now) {
  const keys = getTimestampKeysForModel(model.id);
  const unique = new Set();

  for (const key of keys) {
    const timestamps = result[key] || [];
    for (const ts of timestamps) {
      unique.add(ts);
    }
  }

  const windowStart = now - model.hours * 60 * 60 * 1000;
  let used = 0;
  unique.forEach(ts => {
    if (ts >= windowStart) used += 1;
  });
  return used;
}

function buildActivityDashboard(events) {
  const validEvents = (events || []).filter(Boolean);
  const recentCutoff = Date.now() - ACTIVITY_SUMMARY_WINDOW_MS;
  const recentWindow = validEvents.filter(event => event.ts >= recentCutoff);
  const appCounts = {};
  const featureCounts = {};
  let attachmentTotal = 0;
  let imageTotal = 0;
  let toolTotal = 0;

  for (const event of recentWindow) {
    appCounts[event.app] = (appCounts[event.app] || 0) + 1;
    attachmentTotal += event.attachmentCount || 0;
    imageTotal += event.imageCount || 0;
    toolTotal += event.toolCount || 0;
    for (const feature of event.features || []) {
      featureCounts[feature] = (featureCounts[feature] || 0) + 1;
    }
  }

  return {
    stats: {
      events24h: recentWindow.length,
      attachments24h: attachmentTotal,
      images24h: imageTotal,
      tools24h: toolTotal
    },
    appCounts,
    featureCounts,
    recent: validEvents.slice(0, 5)
  };
}

async function buildDashboardData(planOverride = null) {
  const plan = normalizePlan(planOverride || await getActivePlan());
  const quotaRows = await getQuotaForPlan(plan);
  const catalogMap = await getModelCatalogMap();
  const usageModels = quotaRows.map(row => mergePlanRowWithCatalog(row, catalogMap));
  const storageKeys = ['activityEvents'];

  for (const model of usageModels) {
    storageKeys.push(...getTimestampKeysForModel(model.id));
  }

  const result = await storageGet(storageKeys);
  const now = Date.now();

  const usageData = usageModels.map(model => ({
    id: model.id,
    displayName: model.displayName || model.id,
    family: model.family,
    capabilities: model.capabilities || [],
    used: countRecentTimestamps(result, model, now),
    quota: model.quota,
    hours: model.hours,
    max: typeof model.max === 'number' ? model.max : undefined
  }));

  return {
    data: usageData,
    plan,
    activity: buildActivityDashboard(result.activityEvents || [])
  };
}

async function cleanupOldTimestamps() {
  const all = await fetchQuotaAll();
  const allModels = dedupeModels([
    ...(all.models || []),
    ...(all.free || []),
    ...(all.plus || []),
    ...(all.business || []),
    ...(all.pro || [])
  ]);

  if (!allModels.length) return;

  const storageKeys = [];
  for (const model of allModels) {
    storageKeys.push(...getTimestampKeysForModel(model.id));
  }
  storageKeys.push('activityEvents');

  const result = await storageGet(storageKeys);
  const longest = Math.max(...allModels.map(model => model.hours || 24));
  const cleanupThreshold = Date.now() - longest * 60 * 60 * 1000 * 1.5;
  const activityCutoff = Date.now() - ACTIVITY_RETENTION_MS;
  const changes = {};

  for (const key of storageKeys) {
    if (key === 'activityEvents') continue;
    if (Array.isArray(result[key])) {
      changes[key] = result[key].filter(ts => ts >= cleanupThreshold);
    }
  }

  changes.activityEvents = (result.activityEvents || []).filter(event => event.ts >= activityCutoff);
  await storageSet(changes);
}

chrome.webRequest.onBeforeRequest.addListener(
  async details => {
    if (details.method !== 'POST' || !details.requestBody || !details.requestBody.raw) {
      return;
    }

    try {
      const bytes = details.requestBody.raw[0] && details.requestBody.raw[0].bytes;
      if (!bytes) return;

      const bodyStr = new TextDecoder('utf-8').decode(bytes);
      const body = JSON.parse(bodyStr);
      const apiModelSlug = body.model;
      if (!apiModelSlug) return;

      const modelId = await mapApiModelToId(apiModelSlug);
      if (!modelId) return;

      const catalogMap = await getModelCatalogMap();
      const model = catalogMap.get(modelId) || { id: modelId, displayName: modelId };
      const timestamp = Date.now();
      const key = `timestamps_${modelId}`;
      const result = await storageGet([key]);
      const timestamps = result[key] || [];
      await storageSet({ [key]: [...timestamps, timestamp] });

      const activity = inferActivity(body, details.url || '');
      await appendActivityEvent({
        ts: timestamp,
        modelId,
        displayName: model.displayName || modelId,
        app: activity.app,
        features: activity.features,
        attachmentCount: activity.attachmentCount,
        attachmentMimeTypes: activity.attachmentMimeTypes,
        attachmentSources: activity.attachmentSources,
        imageCount: activity.imageCount,
        toolCount: activity.toolCount,
        toolNames: activity.toolNames,
        skillIds: activity.skillIds,
        skillCount: activity.skillCount,
        connectorIds: activity.connectorIds,
        connectorCount: activity.connectorCount,
        hasConnectorMention: activity.hasConnectorMention,
        sourceCount: activity.sourceCount,
        githubRepoCount: activity.githubRepoCount,
        selectedAllGithubRepos: activity.selectedAllGithubRepos,
        systemHints: activity.systemHints,
        conversationMode: activity.conversationMode,
        gizmoId: activity.gizmoId,
        thinkingEffort: activity.thinkingEffort,
        modelTier: activity.modelTier,
        path: details.url || ''
      });

      // Queue for Supabase sync
      const eventData = {
        ts: timestamp, modelId,
        displayName: model.displayName || modelId,
        app: activity.app,
        features: activity.features,
        attachmentCount: activity.attachmentCount,
        attachmentMimeTypes: activity.attachmentMimeTypes,
        attachmentSources: activity.attachmentSources,
        imageCount: activity.imageCount,
        toolCount: activity.toolCount,
        toolNames: activity.toolNames,
        skillIds: activity.skillIds,
        skillCount: activity.skillCount,
        connectorIds: activity.connectorIds,
        connectorCount: activity.connectorCount,
        hasConnectorMention: activity.hasConnectorMention,
        sourceCount: activity.sourceCount,
        githubRepoCount: activity.githubRepoCount,
        selectedAllGithubRepos: activity.selectedAllGithubRepos,
        systemHints: activity.systemHints,
        conversationMode: activity.conversationMode,
        gizmoId: activity.gizmoId,
        thinkingEffort: activity.thinkingEffort,
        modelTier: activity.modelTier,
        path: details.url || ''
      };
      await appendToSyncQueue({ type: 'event', data: eventData, retryCount: 0 });
      await appendToSyncQueue({ type: 'timestamp', data: { modelId, ts: timestamp }, retryCount: 0 });

      console.log(`Logged timestamps_${modelId} (slug: ${apiModelSlug})`);
    } catch (error) {
      console.warn('Could not parse request body.', error);
    }
  },
  {
    urls: [
      '*://chatgpt.com/backend-api/conversation',
      '*://chatgpt.com/backend-api/*/conversation'
    ]
  },
  ['requestBody']
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    if (request.action === 'getDashboardData' || request.action === 'getUsageData') {
      sendResponse(await buildDashboardData());
      return;
    }

    if (request.action === 'getActivePlan') {
      sendResponse({ plan: await getActivePlan() });
      return;
    }

    if (request.action === 'setActivePlan') {
      await setActivePlan(request.plan);
      sendResponse({ ok: true });
      return;
    }

    if (request.action === 'getSyncStatus') {
      sendResponse(await getSyncStatus());
      return;
    }

    if (request.action === 'forceSyncFlush') {
      await flushSyncQueue();
      sendResponse(await getSyncStatus());
      return;
    }
  })();

  return true;
});

async function ensureAlarmsAndSession() {
  // 알람이 없으면 재생성 (브라우저 재시작 후 혹시 사라진 경우 대비)
  const alarms = await chrome.alarms.getAll();
  const names = new Set(alarms.map(a => a.name));
  if (!names.has('dailyCleanup')) {
    chrome.alarms.create('dailyCleanup', { periodInMinutes: 1440 });
  }
  if (!names.has('syncFlush')) {
    chrome.alarms.create('syncFlush', { periodInMinutes: 5 });
  }

  // 세션 토큰 만료 시 자동 갱신
  await ensureValidSession().catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('dailyCleanup', { periodInMinutes: 1440 });
  chrome.alarms.create('syncFlush', { periodInMinutes: 5 });
});

// 브라우저 재시작 시 세션 갱신 + 알람 재생성
chrome.runtime.onStartup.addListener(() => {
  ensureAlarmsAndSession();
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'dailyCleanup') {
    cleanupOldTimestamps();
  }
  if (alarm.name === 'syncFlush') {
    flushSyncQueue().catch(err => console.warn('Sync flush failed:', err));
  }
});
