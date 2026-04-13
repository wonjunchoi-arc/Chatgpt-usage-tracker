document.addEventListener('DOMContentLoaded', () => {
  // ---- Login gate ----
  const gate = document.getElementById('cqt-gate');
  const panel = document.getElementById('cqt-panel');
  const gateBtn = document.getElementById('cqt-gate-btn');

  gateBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

  panel.hidden = false;

  chrome.runtime.sendMessage({ action: 'getSyncStatus' }, status => {
    gate.hidden = !!(status && status.loggedIn && !chrome.runtime.lastError);
  });

  initPanel();

  function initPanel() {

  const list = document.getElementById('cqt-list');
  const loader = document.getElementById('cqt-loader');
  const seg = document.querySelector('.cqt-segment');
  const segBtns = Array.from(document.querySelectorAll('.cqt-seg-btn'));
  const activitySummary = document.getElementById('cqt-activity-summary');
  const activityList = document.getElementById('cqt-activity-list');

  function t(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
  }

  const labels = {
    free: t('plan_free', 'Free'),
    plus: t('plan_plus', 'Plus'),
    business: t('plan_business', 'Business'),
    pro: t('plan_pro', 'Pro')
  };

  const appLabels = {
    chat: t('app_chat', '채팅'),
    workspace: t('app_workspace', '작업공간'),
    connector: t('app_connector', '앱'),
    skill: t('app_skill', '스킬'),
    project: t('app_project', '프로젝트'),
    canvas: t('app_canvas', '캔버스'),
    images: t('app_images', '이미지'),
    voice: t('app_voice', '음성')
  };

  const featureLabels = {
    search: t('feature_search', '검색'),
    'connector-app': t('feature_connector_app', '앱 연결'),
    'skill-invocation': t('feature_skill_invocation', '스킬 호출'),
    'project-context': t('feature_project_context', '프로젝트'),
    'source-context': t('feature_source_context', '소스'),
    'github-context': t('feature_github_context', 'GitHub'),
    'pro-model': t('feature_pro_model', 'Pro 모델'),
    'data-analysis': t('feature_data_analysis', '데이터 분석'),
    'file-analysis': t('feature_file_analysis', '파일'),
    'image-analysis': t('feature_image_analysis', '이미지 분석'),
    'image-generation': t('feature_image_generation', '이미지 생성'),
    canvas: t('feature_canvas', '캔버스'),
    memory: t('feature_memory', '메모리'),
    voice: t('feature_voice', '음성'),
    'custom-instructions': t('feature_custom_instructions', '커스텀 지시')
  };

  segBtns.forEach(btn => {
    btn.textContent = labels[btn.dataset.plan];
  });

  loader.textContent = t('loading', 'Loading…');
  document.getElementById('cqt-usage-title').textContent = t('usage_title', '모델 사용량');
  document.getElementById('cqt-usage-subtitle').textContent = t('usage_subtitle', '공식 GPT-5.3 / GPT-5.4 기준');
  document.getElementById('cqt-activity-title').textContent = t('activity_title', '최근 활동');
  document.getElementById('cqt-activity-subtitle').textContent = t('activity_subtitle', '프롬프트 본문 제외 메타데이터만 기록');

  let currentPlan = 'plus';

  function formatPeriod(hours) {
    const prefix = t('period_prefix', '매');
    const lang = chrome.i18n.getUILanguage();
    let value;
    let unit;

    if (hours >= 720) {
      value = Math.round(hours / 720);
      unit = t(value > 1 ? 'period_months' : 'period_month', '개월');
    } else if (hours >= 168) {
      value = Math.round(hours / 168);
      unit = t(value > 1 ? 'period_weeks' : 'period_week', '주');
    } else if (hours >= 24) {
      value = Math.round(hours / 24);
      unit = t(value > 1 ? 'period_days' : 'period_day', '일');
    } else {
      value = hours;
      unit = t(value > 1 ? 'period_hours' : 'period_hour', '시간');
    }

    if (lang && lang.startsWith('en') && value === 1) {
      return `${prefix} ${unit}`;
    }

    return `${prefix} ${value} ${unit}`;
  }

  function formatRelativeTime(timestamp) {
    const diffMs = Date.now() - timestamp;
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMinutes < 1) return t('time_now', '방금');
    if (diffMinutes < 60) return `${diffMinutes}${t('time_minute_suffix', '분 전')}`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}${t('time_hour_suffix', '시간 전')}`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}${t('time_day_suffix', '일 전')}`;
  }

  function setActiveButton(plan) {
    segBtns.forEach(btn => {
      const active = btn.dataset.plan === plan;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function renderUsageRows(data) {
    list.textContent = '';

    data.forEach(model => {
      const row = document.createElement('div');
      row.className = 'cqt-model-row';

      const info = document.createElement('div');
      info.className = 'cqt-model-info';

      const nameGroup = document.createElement('div');
      nameGroup.className = 'cqt-model-name-group';

      const nameWrap = document.createElement('div');
      nameWrap.className = 'cqt-model-title-wrap';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'cqt-model-name';
      nameSpan.textContent = model.displayName || model.id;
      nameWrap.appendChild(nameSpan);

      if (model.family) {
        const familySpan = document.createElement('span');
        familySpan.className = 'cqt-model-family';
        familySpan.textContent = model.family;
        nameWrap.appendChild(familySpan);
      }

      nameGroup.appendChild(nameWrap);

      if (model.quota > 0) {
        const periodSpan = document.createElement('span');
        periodSpan.className = 'cqt-model-period';
        periodSpan.textContent = formatPeriod(model.hours);
        nameGroup.appendChild(periodSpan);
      }

      info.appendChild(nameGroup);

      const usageSpan = document.createElement('span');
      usageSpan.className = 'cqt-model-usage';
      if (model.quota > 0) {
        usageSpan.textContent = `${model.used} / ${model.quota}`;
      } else {
        usageSpan.innerHTML = `${model.used} / <span class="cqt-infty">∞</span>`;
      }
      info.appendChild(usageSpan);
      row.appendChild(info);

      if (Array.isArray(model.capabilities) && model.capabilities.length) {
        const capabilityWrap = document.createElement('div');
        capabilityWrap.className = 'cqt-capability-list';
        model.capabilities.slice(0, 4).forEach(capability => {
          const chip = document.createElement('span');
          chip.className = 'cqt-chip cqt-chip-muted';
          chip.textContent = featureLabels[capability] || capability;
          capabilityWrap.appendChild(chip);
        });
        row.appendChild(capabilityWrap);
      }

      const barContainer = document.createElement('div');
      barContainer.className = 'cqt-progress-bar-container';

      const denom = model.quota > 0
        ? model.quota
        : (typeof model.max === 'number' ? model.max : 200);
      const percentage = Math.max(0, Math.min(100, denom ? (model.used / denom) * 100 : 0));

      const progressBar = document.createElement('div');
      progressBar.className = 'cqt-progress-bar';
      progressBar.style.width = `${percentage}%`;

      barContainer.appendChild(progressBar);
      row.appendChild(barContainer);
      list.appendChild(row);
    });
  }

  function renderActivity(activity) {
    activitySummary.textContent = '';
    activityList.textContent = '';

    if (!activity || !activity.recent || !activity.recent.length) {
      const empty = document.createElement('div');
      empty.className = 'cqt-empty';
      empty.textContent = t('activity_empty', '아직 기록된 활동이 없습니다.');
      activityList.appendChild(empty);
      return;
    }

    const summaryEntries = [
      { label: t('summary_events', '최근 24시간 활동'), value: activity.stats.events24h },
      { label: t('summary_tools', '도구 사용'), value: activity.stats.tools24h },
      { label: t('summary_attachments', '첨부'), value: activity.stats.attachments24h },
      { label: t('summary_images', '이미지'), value: activity.stats.images24h }
    ];

    summaryEntries.forEach(entry => {
      const chip = document.createElement('span');
      chip.className = 'cqt-chip';
      chip.textContent = `${entry.label} ${entry.value}`;
      activitySummary.appendChild(chip);
    });

    Object.entries(activity.featureCounts || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .forEach(([feature, count]) => {
        const chip = document.createElement('span');
        chip.className = 'cqt-chip cqt-chip-accent';
        chip.textContent = `${featureLabels[feature] || feature} ${count}`;
        activitySummary.appendChild(chip);
      });

    activity.recent.forEach(event => {
      const row = document.createElement('div');
      row.className = 'cqt-activity-row';

      const top = document.createElement('div');
      top.className = 'cqt-activity-top';

      const title = document.createElement('span');
      title.className = 'cqt-activity-model';
      title.textContent = event.displayName || event.modelId;
      top.appendChild(title);

      const time = document.createElement('span');
      time.className = 'cqt-activity-time';
      time.textContent = formatRelativeTime(event.ts);
      top.appendChild(time);
      row.appendChild(top);

      const meta = document.createElement('div');
      meta.className = 'cqt-activity-meta';
      const parts = [appLabels[event.app] || event.app];

      if (event.toolCount) parts.push(`${t('summary_tools', '도구 사용')} ${event.toolCount}`);
      if (event.attachmentCount) parts.push(`${t('summary_attachments', '첨부')} ${event.attachmentCount}`);
      if (event.imageCount) parts.push(`${t('summary_images', '이미지')} ${event.imageCount}`);
      if (event.connectorCount) parts.push(`${t('summary_connectors', '앱')} ${event.connectorCount}`);
      if (event.sourceCount) parts.push(`${t('summary_sources', '소스')} ${event.sourceCount}`);
      if (event.githubRepoCount) parts.push(`GitHub ${event.githubRepoCount}`);
      if (event.selectedAllGithubRepos) parts.push(t('summary_all_github', '전체 GitHub'));
      if (event.modelTier === 'pro') parts.push(t('feature_pro_model', 'Pro 모델'));
      if (event.thinkingEffort) parts.push(`${t('summary_thinking_effort', '추론')} ${event.thinkingEffort}`);

      meta.textContent = parts.join(' · ');
      row.appendChild(meta);

      if (Array.isArray(event.features) && event.features.length) {
        const featureWrap = document.createElement('div');
        featureWrap.className = 'cqt-chip-list cqt-chip-list-tight';
        event.features.slice(0, 4).forEach(feature => {
          const chip = document.createElement('span');
          chip.className = 'cqt-chip cqt-chip-muted';
          chip.textContent = featureLabels[feature] || feature;
          featureWrap.appendChild(chip);
        });
        row.appendChild(featureWrap);
      }

      activityList.appendChild(row);
    });
  }

  function renderError() {
    list.textContent = '';
    activitySummary.textContent = '';
    activityList.textContent = '';

    const err = document.createElement('div');
    err.className = 'cqt-error';
    err.textContent = t('error', '오류가 발생했습니다.');
    list.appendChild(err);
  }

  function refresh() {
    list.textContent = '';
    list.appendChild(loader);
    activitySummary.textContent = '';
    activityList.textContent = '';

    chrome.runtime.sendMessage({ action: 'getDashboardData' }, resp => {
      if (chrome.runtime.lastError || !resp) {
        renderError();
        return;
      }

      currentPlan = resp.plan || 'plus';
      setActiveButton(currentPlan);
      renderUsageRows(resp.data || []);
      renderActivity(resp.activity || {});
    });
  }

  const syncBar = document.getElementById('cqt-sync-bar');
  const syncText = document.getElementById('cqt-sync-text');
  const syncLink = document.getElementById('cqt-sync-link');

  function renderSyncBar() {
    chrome.runtime.sendMessage({ action: 'getSyncStatus' }, status => {
      if (chrome.runtime.lastError || !status) {
        syncBar.hidden = true;
        return;
      }

      syncBar.hidden = false;

      if (!status.loggedIn) {
        syncText.textContent = t('sync_not_logged_in', '서버 동기화 미연결');
        syncLink.textContent = t('sync_sign_in_prompt', '설정');
        syncLink.onclick = (e) => {
          e.preventDefault();
          chrome.runtime.openOptionsPage();
        };
      } else {
        const parts = [];
        if (status.teamName) parts.push(status.teamName);
        if (status.queueSize > 0) parts.push(`${t('sync_queue', '대기')} ${status.queueSize}`);
        if (status.lastSyncTimestamp) {
          parts.push(`${t('sync_last', '최근')} ${formatRelativeTime(status.lastSyncTimestamp)}`);
        }
        syncText.textContent = parts.join(' · ') || status.email;
        syncLink.textContent = t('sync_settings', '설정');
        syncLink.onclick = (e) => {
          e.preventDefault();
          chrome.runtime.openOptionsPage();
        };
      }
    });
  }

  chrome.runtime.sendMessage({ action: 'getActivePlan' }, resp => {
    currentPlan = (resp && resp.plan) || 'plus';
    setActiveButton(currentPlan);
    refresh();
    renderSyncBar();
  });

  seg.addEventListener('click', event => {
    const btn = event.target.closest('.cqt-seg-btn');
    if (!btn) return;

    const plan = btn.dataset.plan;
    chrome.runtime.sendMessage({ action: 'setActivePlan', plan }, () => {
      currentPlan = plan;
      setActiveButton(currentPlan);
      refresh();
    });
  });

  } // end initPanel
});
