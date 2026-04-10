# ChatGPT Usage Limit Tracker - 완전 재현 개발 명세서

> 이 문서만으로 AI가 아이콘 생성 + 한글 로케일 포함 최종 완성 Chrome Extension을 만들 수 있다.

---

## 1. 프로젝트 개요

ChatGPT 웹 앱의 HTTP 요청을 감청하여 모델별 메시지 사용량을 추적하고, 구독 플랜별 쿼터 대비 사용량을 팝업 UI로 보여주는 Chrome Extension (Manifest V3).

---

## 2. 최종 파일 구조

아래의 모든 파일을 생성해야 한다:

```text
chatgpt-usage-limit-tracker/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── style.css
├── quota.json
├── icons/
│   ├── icon16.png     (16x16 RGBA PNG)
│   ├── icon48.png     (48x48 RGBA PNG)
│   └── icon128.png    (128x128 RGBA PNG)
└── _locales/
    ├── en/messages.json
    ├── ko/messages.json
    ├── ja/messages.json
    └── zh_TW/messages.json
```

---

## 3. 아이콘 사양

3가지 크기의 PNG 아이콘을 생성해야 한다 (16x16, 48x48, 128x128).

### 디자인 명세

- **형태**: 모서리가 둥근 정사각형 배경 위에 모래시계 아이콘
- **배경색**: `#3EAF85` (민트 그린 계열, ChatGPT 브랜드 그린에 가까움)
- **모서리 반경**: 전체 크기의 약 20% (128px 기준 약 26px)
- **아이콘 색상**: 흰색 (`#FFFFFF`)
- **모래시계**: 배경 중앙에 위치, 배경 면적의 약 55~60% 차지
- **모래시계 형태**: 위아래가 넓고 가운데가 좁은 전통적 모래시계. 위쪽 유리에는 모래가 빠져나간 빈 공간, 아래쪽 유리에는 모래가 쌓인 형태로 "시간이 흐르고 있음"을 표현
- **파일 형식**: PNG, 8-bit/color RGBA, non-interlaced

---

## 4. manifest.json - 확장 프로그램 설정

```json
{
  "manifest_version": 3,
  "default_locale": "en",
  "name": "__MSG_extensionName__",
  "version": "2.2",
  "description": "__MSG_extensionDescription__",
  "permissions": [
    "storage",
    "webRequest",
    "alarms"
  ],
  "host_permissions": [
    "*://chatgpt.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 권한 설명

| 권한 | 용도 |
| ---- | ---- |
| `storage` | 타임스탬프, 캐시된 쿼터, 활성 플랜을 `chrome.storage.local`에 저장 |
| `webRequest` | `chatgpt.com`의 HTTP POST 요청 감청 |
| `alarms` | 24시간마다 오래된 타임스탬프 정리 |
| `*://chatgpt.com/*` | ChatGPT 도메인의 요청 body 접근 |
| `*://raw.githubusercontent.com/*` | 원격 quota.json 다운로드 |

### i18n

`name`과 `description`은 `__MSG_키__` 형식으로 참조한다. Chrome이 `_locales/{lang}/messages.json`에서 자동 치환한다.

---

## 5. background.js - 서비스 워커 (핵심 로직)

이 파일이 확장의 두뇌다. 3가지 책임을 갖는다:
1. ChatGPT API 요청 감청 및 타임스탬프 기록
2. 팝업의 메시지 요청에 응답 (사용량 데이터, 플랜 관리)
3. 오래된 타임스탬프 자동 정리

### 5.1 전역 상수

```javascript
const DEBUG = true;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1시간
```

- `DEBUG = true`이므로 항상 로컬 `quota.json`만 사용한다. 외부 네트워크 요청 없음.

### 5.2 Chrome Storage 스키마

`chrome.storage.local`에 저장되는 키-값 구조:

| 키 | 타입 | 설명 |
| ---- | ---- | ---- |
| `timestamps_{modelId}` | `number[]` | 해당 모델의 메시지 감지 시각 (Unix ms) 배열 |
| `cachedQuotaAll` | `object` | 정규화된 quota 데이터 캐시 |
| `lastFetchTimestamp` | `number` | 마지막 quota fetch 시각 (Unix ms) |
| `activePlan` | `string` | 현재 선택된 플랜 (`"free"`, `"plus"`, `"team"`, `"pro"`) |

### 5.3 쿼터 데이터 로딩

```text
fetchQuotaAll() 호출
  ├─ 캐시 존재 & 1시간 이내? → 캐시 반환
  ├─ 로컬 quota.json fetch (chrome.runtime.getURL) → 캐시 저장 후 반환
  └─ 실패 → 빈 구조 반환: { models:[], free:[], plus:[], team:[], pro:[] }
```

`normalizeQuotaShape(raw)` 함수가 다양한 형식의 quota.json을 통일된 구조로 변환한다:

```javascript
// 통일 구조
{
  models: [...],  // 전체 모델 목록 (레거시 호환)
  free: [...],
  plus: [...],
  team: [...],
  pro: [...]
}
```

변환 규칙:
- 배열이면 → `plus`와 `models`에 할당
- `free/plus/team/pro` 키가 있으면 → 그대로 사용, 빈 것은 `[]`
- `models`만 있으면 → `plus`로 복사
- 그 외 → 모두 빈 배열

### 5.4 모델 ID 매핑 - mapApiModelToId()

ChatGPT API의 `body.model` 값(slug)을 quota.json의 `id`로 매핑한다.

```text
매핑 우선순위:
1. 완전 일치: slug === model.id
2. 부분 일치: slug.includes(model.id) — ID 길이 내림차순으로 검색
   (예: "4.1-mini"가 "4.1"보다 먼저 매칭되도록)
3. 점↔하이픈 변환: "4.5" ↔ "4-5" 양방향 매칭
4. auto 특수 처리: slug가 "auto"이고 quota에 "auto"가 있으면 매핑
5. 매칭 실패 → null 반환 (기록하지 않음)
```

### 5.5 요청 감청 및 타임스탬프 기록

```javascript
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    // POST 요청만 처리
    if (details.method === "POST" && details.requestBody && details.requestBody.raw) {
      // requestBody.raw[0].bytes를 UTF-8로 디코딩 → JSON 파싱
      const bodyStr = new TextDecoder("utf-8").decode(details.requestBody.raw[0].bytes);
      const body = JSON.parse(bodyStr);
      const apiModelSlug = body.model;
      // slug가 없으면 무시
      if (!apiModelSlug) return;

      const modelId = await mapApiModelToId(apiModelSlug);
      if (!modelId) return;

      const timestamp = Date.now();

      // 1차 키: timestamps_{modelId}
      const primaryKey = `timestamps_${modelId}`;
      // 특수: gpt-5 감지 시 timestamps_auto에도 동시 기록 (Free 플랜 호환)
      const extraKey = (modelId === 'gpt-5') ? 'timestamps_auto' : null;

      // storage에서 기존 배열 읽기 → push → 저장
      const keys = extraKey ? [primaryKey, extraKey] : [primaryKey];
      chrome.storage.local.get(keys, (result) => {
        const changes = {};
        const primaryArr = result[primaryKey] || [];
        primaryArr.push(timestamp);
        changes[primaryKey] = primaryArr;

        if (extraKey) {
          const extraArr = result[extraKey] || [];
          extraArr.push(timestamp);
          changes[extraKey] = extraArr;
        }

        chrome.storage.local.set(changes);
      });
    }
  },
  {
    urls: [
      "*://chatgpt.com/backend-api/conversation",
      "*://chatgpt.com/backend-api/*/conversation"
    ]
  },
  ["requestBody"]  // requestBody 접근을 위해 필수
);
```

**핵심 포인트**:
- 감청 URL 패턴: `*://chatgpt.com/backend-api/conversation` 및 `*://chatgpt.com/backend-api/*/conversation`
- `requestBody.raw[0].bytes`를 디코딩하여 `body.model`만 추출 — **메시지 내용은 읽지 않음**
- `gpt-5` 모델은 `timestamps_auto`에도 이중 기록 (Free 플랜에서 `auto`로 쿼터가 정의되므로)

### 5.6 메시지 핸들러 (팝업 ↔ 백그라운드 통신)

`chrome.runtime.onMessage`로 3가지 액션을 처리한다:

**`getUsageData`** — 현재 플랜의 모델별 사용량 계산:

```javascript
// 각 모델에 대해:
const timestamps = result[`timestamps_${model.id}`] || [];
const windowStart = now - (model.hours * 60 * 60 * 1000);
const used = timestamps.filter(ts => ts >= windowStart).length;
// 응답: { data: [{ id, used, quota, hours, max }, ...], plan }
```

**`getActivePlan`** — 저장된 활성 플랜 반환. 기본값: `"plus"`

**`setActivePlan`** — `activePlan`을 storage에 저장

모든 핸들러는 `return true`로 비동기 응답을 허용한다.

### 5.7 타임스탬프 자동 정리

```javascript
// 설치 시 24시간(1440분) 주기 알람 등록
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("dailyCleanup", { periodInMinutes: 1440 });
});

// 알람 발생 시 정리 실행
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyCleanup") cleanupOldTimestamps();
});
```

정리 기준: 모든 모델 중 가장 긴 윈도우(`hours`)의 **1.5배** 이전 타임스탬프를 삭제.
예: 최장 168시간(1주) → 252시간(10.5일) 이전 데이터 삭제.

### 5.8 전체 코드

```javascript
const DEBUG = true;

const CACHE_DURATION_MS = 60 * 60 * 1000; // Cache for 1 hour

function readStoredCache() {
  return new Promise(resolve => {
    chrome.storage.local.get(
      ['cachedQuotaAll', 'lastFetchTimestamp', 'activePlan'],
      items => {
        resolve({
          cachedQuotaAll: items.cachedQuotaAll || null,
          lastFetchTimestamp: items.lastFetchTimestamp || 0,
          activePlan: items.activePlan || 'plus'
        });
      }
    );
  });
}

function writeStoredCache(quotaAll, timestamp) {
  chrome.storage.local.set({
    cachedQuotaAll: quotaAll,
    lastFetchTimestamp: timestamp
  });
}

async function getActivePlan() {
  const { activePlan } = await readStoredCache();
  return activePlan || 'plus';
}

function setActivePlan(plan) {
  return new Promise(resolve => {
    chrome.storage.local.set({ activePlan: plan }, resolve);
  });
}

function normalizeQuotaShape(raw) {
  if (!raw) return { models: [], free: [], plus: [], team: [], pro: [] };
  if (Array.isArray(raw)) {
    return { models: raw, free: [], plus: raw, team: [], pro: [] };
  }
  if (raw.free || raw.plus || raw.team || raw.pro) {
    return {
      models: raw.models && raw.models.length ? raw.models : (raw.plus || []),
      free: raw.free || [],
      plus: raw.plus || raw.models || [],
      team: raw.team || [],
      pro: raw.pro || []
    };
  }
  if (raw.models) {
    return { models: raw.models, free: [], plus: raw.models, team: [], pro: [] };
  }
  return { models: [], free: [], plus: [], team: [], pro: [] };
}

async function fetchQuotaAll() {
  let sourceUrl = DEBUG ? chrome.runtime.getURL('quota.json') : QUOTA_DATA_URL;
  const now = Date.now();
  const { cachedQuotaAll, lastFetchTimestamp } = await readStoredCache();

  if (cachedQuotaAll && (now - lastFetchTimestamp < CACHE_DURATION_MS)) {
    return cachedQuotaAll;
  }

  async function loadFrom(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Fetch failed ${resp.status}`);
    const data = await resp.json();
    return normalizeQuotaShape(data);
  }

  try {
    const normalized = await loadFrom(sourceUrl);
    writeStoredCache(normalized, now);
    return normalized;
  } catch (err) {
    console.error('Remote quota fetch failed:', err, 'Falling back to local quota.json');
    try {
      const fallback = await loadFrom(chrome.runtime.getURL('quota.json'));
      writeStoredCache(fallback, now);
      return fallback;
    } catch (fallbackErr) {
      console.error('CRITICAL: local quota.json failed too', fallbackErr);
      return { models: [], free: [], plus: [], team: [], pro: [] };
    }
  }
}

async function getQuotaForPlan(planOverride = null) {
  const plan = planOverride || await getActivePlan();
  const all = await fetchQuotaAll();
  const map = {
    free: all.free,
    plus: all.plus || all.models,
    team: all.team,
    pro: all.pro
  };
  return map[plan] || all.plus || all.models || [];
}

async function getAllKnownModels() {
  const all = await fetchQuotaAll();
  const buckets = [all.free, all.plus || all.models, all.team, all.pro].filter(Boolean);
  const dedup = new Map();
  for (const list of buckets) {
    (list || []).forEach(m => {
      if (m && m.id && !dedup.has(m.id)) dedup.set(m.id, m);
    });
  }
  return Array.from(dedup.values());
}

async function mapApiModelToId(apiModelSlug) {
  if (!apiModelSlug) return null;
  const known = await getAllKnownModels();

  const exact = known.find(m => m.id === apiModelSlug);
  if (exact) return exact.id;

  const sorted = [...known].sort((a, b) => b.id.length - a.id.length);
  for (const m of sorted) {
    const id = m.id;
    const alt = id.includes('.') ? id.replace('.', '-') : null;
    if (apiModelSlug.includes(id)) return id;
    if (alt && apiModelSlug.includes(alt)) return id;
  }

  if (apiModelSlug === 'auto') {
    const hasAuto = known.find(m => m.id === 'auto');
    if (hasAuto) return 'auto';
  }

  console.warn(`No matching model found for API slug: ${apiModelSlug}`);
  return null;
}

chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.method === "POST" && details.requestBody && details.requestBody.raw) {
      try {
        const bodyStr = new TextDecoder("utf-8").decode(details.requestBody.raw[0].bytes);
        const body = JSON.parse(bodyStr);
        const apiModelSlug = body.model;
        if (!apiModelSlug) return;

        const modelId = await mapApiModelToId(apiModelSlug);
        if (!modelId) return;

        const timestamp = Date.now();

        const primaryKey = `timestamps_${modelId}`;
        const extraKey = (modelId === 'gpt-5') ? 'timestamps_auto' : null;

        const keys = extraKey ? [primaryKey, extraKey] : [primaryKey];
        chrome.storage.local.get(keys, (result) => {
          const changes = {};
          const primaryArr = result[primaryKey] || [];
          primaryArr.push(timestamp);
          changes[primaryKey] = primaryArr;

          if (extraKey) {
            const extraArr = result[extraKey] || [];
            extraArr.push(timestamp);
            changes[extraKey] = extraArr;
          }

          chrome.storage.local.set(changes, () => {
            console.log(`Logged ${primaryKey}${extraKey ? ' & '+extraKey : ''} (slug: ${apiModelSlug})`);
          });
        });
      } catch (e) {
        console.warn("Could not parse request body.", e);
      }
    }
  },
  {
    urls: [
      "*://chatgpt.com/backend-api/conversation",
      "*://chatgpt.com/backend-api/*/conversation"
    ]
  },
  ["requestBody"]
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    if (request.action === "getUsageData") {
      const plan = await getActivePlan();
      const quotaData = await getQuotaForPlan(plan);
      const storageKeys = quotaData.map(m => `timestamps_${m.id}`);

      chrome.storage.local.get(storageKeys, (result) => {
        const now = Date.now();
        const usageData = quotaData.map(model => {
          const timestamps = result[`timestamps_${model.id}`] || [];
          const windowStart = now - (model.hours * 60 * 60 * 1000);
          const used = timestamps.filter(ts => ts >= windowStart).length;
          return {
            id: model.id,
            used,
            quota: model.quota,
            hours: model.hours,
            max: typeof model.max === 'number' ? model.max : undefined
          };
        });
        sendResponse({ data: usageData, plan });
      });
    } else if (request.action === "getActivePlan") {
      const plan = await getActivePlan();
      sendResponse({ plan });
    } else if (request.action === "setActivePlan") {
      await setActivePlan(request.plan);
      sendResponse({ ok: true });
    }
  })();
  return true;
});

async function cleanupOldTimestamps() {
  const allModels = await getAllKnownModels();
  if (!allModels.length) return;

  const storageKeys = allModels.map(m => `timestamps_${m.id}`);
  chrome.storage.local.get(storageKeys, (result) => {
    let changes = {};
    const longest = Math.max(...allModels.map(m => m.hours || 24));
    const cleanupThreshold = Date.now() - (longest * 60 * 60 * 1000 * 1.5);

    for (const key in result) {
      if (Array.isArray(result[key])) {
        changes[key] = result[key].filter(ts => ts >= cleanupThreshold);
      }
    }
    chrome.storage.local.set(changes);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("dailyCleanup", { periodInMinutes: 1440 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyCleanup") {
    cleanupOldTimestamps();
  }
});
```

---

## 6. popup.html - 팝업 UI 마크업

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>ChatGPT Usage Limit Tracker</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div id="cqt-panel">
      <div class="cqt-segment" role="tablist" aria-label="Plan">
        <button class="cqt-seg-btn" data-plan="free" role="tab"></button>
        <button class="cqt-seg-btn" data-plan="plus" role="tab"></button>
        <button class="cqt-seg-btn" data-plan="team" role="tab"></button>
        <button class="cqt-seg-btn" data-plan="pro" role="tab"></button>
      </div>

      <div id="cqt-list">
        <div class="cqt-loader" id="cqt-loader">Loading...</div>
      </div>
    </div>
    <script src="popup.js"></script>
  </body>
</html>
```

구조 설명:
- 버튼의 텍스트는 비워두고 `popup.js`에서 JS로 채운다 (`Free`, `Plus`, `Team`, `Pro`)
- `data-plan` 속성으로 각 버튼의 플랜을 식별
- `#cqt-list`는 모델 행들이 동적 삽입되는 컨테이너
- `#cqt-loader`는 로딩 중 표시 (i18n 메시지로 텍스트 교체됨)

---

## 7. popup.js - 팝업 UI 로직

### 7.1 초기화 흐름

```text
DOMContentLoaded 이벤트
  ├─ 버튼 텍스트 설정 (Free/Plus/Team/Pro)
  ├─ 로더 텍스트 i18n 설정
  ├─ getActivePlan 메시지 → 현재 플랜 수신
  ├─ setActiveButton() → 해당 버튼 활성화
  └─ refresh() → getUsageData → renderRows()
```

### 7.2 기간 포맷 함수 - formatPeriod(hours)

hours 값을 사람이 읽을 수 있는 문자열로 변환한다:

```text
hours >= 720  → "Every {N} month(s)"   / "매 {N} 개월"
hours >= 168  → "Every {N} week(s)"    / "매 {N} 주"
hours >= 24   → "Every {N} day(s)"     / "매 {N} 일"
hours < 24    → "Every {N} hour(s)"    / "매 {N} 시간"
```

영어에서 값이 1일 때는 숫자를 생략한다: `"Every hour"` (not `"Every 1 hour"`).

### 7.3 렌더링 - renderRows(data, plan)

각 모델에 대해 다음 DOM 구조를 생성한다:

```text
div.cqt-model-row
  ├─ div.cqt-model-info
  │   ├─ div.cqt-model-name-group
  │   │   ├─ span.cqt-model-name          → "gpt-5" (Free의 auto → "gpt-5"로 표시)
  │   │   └─ span.cqt-model-period         → "Every 3 hours" (quota <= 0이면 생략)
  │   └─ span.cqt-model-usage             → "45 / 160" 또는 "45 / ∞"
  └─ div.cqt-progress-bar-container
      └─ div.cqt-progress-bar             → width: {percentage}%
```

**프로그레스 바 계산**:
- `quota > 0`: `percentage = (used / quota) * 100`
- `quota <= 0` (무제한): `percentage = (used / max) * 100` (max 미정의시 200)
- 0~100% 범위로 클램핑

**무제한 모델 표시**:
- 사용량 텍스트: `"{used} / ∞"` — 무한대 기호는 `<span class="cqt-infty">∞</span>`으로 별도 폰트 적용
- 기간 배지: 표시하지 않음

### 7.4 플랜 전환

세그먼트 버튼 클릭 시:

```text
click → setActivePlan 메시지 → storage 저장 → refresh() → 재렌더링
```

### 7.5 전체 코드

```javascript
document.addEventListener('DOMContentLoaded', async function () {
  const list = document.getElementById('cqt-list');
  const loader = document.getElementById('cqt-loader');
  const seg = document.querySelector('.cqt-segment');
  const segBtns = Array.from(document.querySelectorAll('.cqt-seg-btn'));

  const labels = {
    free: 'Free',
    plus: 'Plus',
    team: 'Team',
    pro: 'Pro'
  };
  segBtns.forEach(btn => { btn.textContent = labels[btn.dataset.plan]; });
  loader.textContent = chrome.i18n.getMessage('loading') || 'Loading…';

  let currentPlan = 'plus';

  function formatPeriod(hours) {
    const prefix = chrome.i18n.getMessage("period_prefix");
    const lang = chrome.i18n.getUILanguage();
    let value, unit;

    if (hours >= 720) {
      value = Math.round(hours / 720);
      unit = chrome.i18n.getMessage(value > 1 ? "period_months" : "period_month");
    } else if (hours >= 168) {
      value = Math.round(hours / 168);
      unit = chrome.i18n.getMessage(value > 1 ? "period_weeks" : "period_week");
    } else if (hours >= 24) {
      value = Math.round(hours / 24);
      unit = chrome.i18n.getMessage(value > 1 ? "period_days" : "period_day");
    } else {
      value = hours;
      unit = chrome.i18n.getMessage(value > 1 ? "period_hours" : "period_hour");
    }

    if (lang && lang.startsWith("en") && value === 1) {
      return `${prefix} ${unit}`;
    }
    return `${prefix} ${value} ${unit}`;
  }

  function setActiveButton(plan) {
    segBtns.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.plan === plan);
      btn.setAttribute('aria-selected', btn.dataset.plan === plan ? 'true' : 'false');
    });
  }

  function renderRows(data, plan) {
    list.textContent = '';
    data.forEach(model => {
      const row = document.createElement('div');
      row.className = 'cqt-model-row';

      const info = document.createElement('div');
      info.className = 'cqt-model-info';

      const nameGroup = document.createElement('div');
      nameGroup.className = 'cqt-model-name-group';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'cqt-model-name';
      const displayName = (plan === 'free' && model.id === 'auto') ? 'gpt-5' : model.id;
      nameSpan.textContent = displayName;
      nameGroup.appendChild(nameSpan);

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

      const barContainer = document.createElement('div');
      barContainer.className = 'cqt-progress-bar-container';

      const denom = model.quota > 0
        ? model.quota
        : (typeof model.max === 'number' ? model.max : 200);

      const percentage = Math.max(0, Math.min(100, (denom ? (model.used / denom) * 100 : 0)));

      const progressBar = document.createElement('div');
      progressBar.className = 'cqt-progress-bar';
      progressBar.style.width = `${percentage}%`;

      barContainer.appendChild(progressBar);
      row.appendChild(barContainer);

      list.appendChild(row);
    });
  }

  function refresh() {
    list.textContent = '';
    list.appendChild(loader);
    chrome.runtime.sendMessage({ action: 'getUsageData' }, (resp) => {
      if (chrome.runtime.lastError || !resp) {
        list.textContent = '';
        const err = document.createElement('div');
        err.className = 'cqt-error';
        err.textContent = chrome.i18n.getMessage('error') || 'Error.';
        list.appendChild(err);
        return;
      }
      currentPlan = resp.plan || 'plus';
      setActiveButton(currentPlan);
      renderRows(resp.data, currentPlan);
    });
  }

  // init
  chrome.runtime.sendMessage({ action: 'getActivePlan' }, (resp) => {
    currentPlan = (resp && resp.plan) || 'plus';
    setActiveButton(currentPlan);
    refresh();
  });

  seg.addEventListener('click', (e) => {
    const btn = e.target.closest('.cqt-seg-btn');
    if (!btn) return;
    const plan = btn.dataset.plan;
    chrome.runtime.sendMessage({ action: 'setActivePlan', plan }, () => {
      currentPlan = plan;
      setActiveButton(currentPlan);
      refresh();
    });
  });
});
```

---

## 8. style.css - 팝업 스타일

### 8.1 디자인 사양

| 항목 | 값 |
| ---- | ---- |
| 팝업 너비 | 340px |
| 패딩 | 16px |
| 기본 폰트 | system-ui 스택 (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...) |
| 사용량 폰트 | monospace 스택 (ui-monospace, SFMono-Regular, Menlo, Monaco, ...) |
| 프로그레스 바 높이 | 8px |
| 프로그레스 바 색상 | `#19c37d` (ChatGPT 브랜드 그린) |
| 프로그레스 바 배경 | `#e9ecef` (라이트) / `#3a3a3a` (다크) |
| 프로그레스 바 애니메이션 | `transition: width 0.3s ease-in-out` |
| 세그먼트 배경 | `#f2f3f5` (라이트) / `#2a2a2a` (다크) |
| 활성 버튼 | 흰색 배경 + 그림자 (라이트) / `#0f0f0f` (다크) |
| 모델명 크기 | 15px, font-weight 600 |
| 기간 배지 | 12px, 회색 배경 라운드 칩 |
| 에러 텍스트 | `#d9534f` |
| 다크 모드 | `@media (prefers-color-scheme: dark)` 자동 대응 |

### 8.2 CSS 클래스 맵

| 클래스 | 용도 |
| ---- | ---- |
| `#cqt-panel` | 팝업 최외곽 컨테이너 |
| `.cqt-segment` | 플랜 선택 버튼 그룹 (flexbox) |
| `.cqt-seg-btn` | 개별 플랜 버튼 |
| `.cqt-seg-btn.is-active` | 현재 선택된 플랜 버튼 |
| `.cqt-model-row` | 모델 한 줄 (정보 + 바) |
| `.cqt-model-info` | 모델명 + 사용량 텍스트 행 (flex, space-between) |
| `.cqt-model-name-group` | 모델명 + 기간 배지 묶음 (flex, baseline) |
| `.cqt-model-name` | 모델 ID 텍스트 |
| `.cqt-model-period` | 기간 배지 (회색 칩) |
| `.cqt-model-usage` | 사용량 텍스트 (monospace) |
| `.cqt-infty` | 무한대 기호 전용 폰트 |
| `.cqt-progress-bar-container` | 프로그레스 바 트랙 |
| `.cqt-progress-bar` | 프로그레스 바 게이지 |
| `.cqt-loader` | 로딩 중 텍스트 |
| `.cqt-error` | 에러 텍스트 |

### 8.3 전체 코드

```css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

#cqt-panel {
  width: 340px;
  padding: 16px;
  color: #1a1a1a;
  background-color: #ffffff;
}

/* ---- plan segmented row ---- */
.cqt-segment {
  display: flex;
  gap: 4px;
  background: #f2f3f5;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 15px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05);
}

.cqt-seg-btn {
  flex: 1;
  appearance: none;
  border: none;
  background: transparent;
  padding: 8px 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #444;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cqt-seg-btn.is-active {
  background: #ffffff;
  color: #0b0b0b;
  box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.06);
}


.cqt-model-row {
  margin-bottom: 16px;
}

.cqt-model-row:last-child {
  margin-bottom: 0;
}

.cqt-model-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.cqt-model-name-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.cqt-model-name {
  font-weight: 600;
  font-size: 15px;
  color: #333;
}

.cqt-model-period {
  font-size: 12px;
  color: #888;
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.cqt-model-usage {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.cqt-infty {
  font-family: -apple-system, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans", "Apple Symbols", "Noto Sans Symbols2", "Segoe UI Symbol", "STIXGeneral", "Symbola", sans-serif;
}

.cqt-progress-bar-container {
  width: 100%;
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.cqt-progress-bar {
  height: 100%;
  background-color: #19c37d;
  border-radius: 4px;
  transition: width 0.3s ease-in-out;
}

.cqt-loader, .cqt-error {
  text-align: center;
  padding: 20px;
  color: #888;
  font-size: 14px;
}

.cqt-error {
  color: #d9534f;
}

/* ---- dark mode ---- */
@media (prefers-color-scheme: dark) {
  body, #cqt-panel {
    background-color: #1f1f1f;
    color: #e5e5e5;
  }

  .cqt-segment {
    background: #2a2a2a;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
  }

  .cqt-seg-btn { color: #c9c9c9; }
  .cqt-seg-btn.is-active {
    background: #0f0f0f;
    color: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06);
  }

  .cqt-model-name { color: #f0f0f0; }
  .cqt-model-usage, .cqt-model-period { color: #b0b0b0; }
  .cqt-model-period { background-color: #3a3a3a; }
  .cqt-progress-bar-container { background-color: #3a3a3a; }
}
```

---

## 9. quota.json - 모델별 쿼터 정의

```json
{
  "models": [
    { "id": "gpt-5-thinking", "quota": 3000, "hours": 168 },
    { "id": "gpt-5", "quota": 160, "hours": 3 },
    { "id": "o3", "quota": 100, "hours": 168 },
    { "id": "o4-mini-high", "quota": 100, "hours": 24 },
    { "id": "o4-mini", "quota": 300, "hours": 24 },
    { "id": "4.5", "quota": 50, "hours": 168 },
    { "id": "4.1", "quota": 80, "hours": 3 },
    { "id": "4.1-mini", "quota": 80, "hours": 3 },
    { "id": "4o", "quota": 80, "hours": 3 }
  ],
  "free": [
    { "id": "auto", "quota": 10, "hours": 5 }
  ],
  "plus": [
    { "id": "gpt-5", "quota": 160, "hours": 3 },
    { "id": "gpt-5-thinking", "quota": 3000, "hours": 168 }
  ],
  "team": [
    { "id": "gpt-5", "quota": -1, "hours": 3, "max": 160 },
    { "id": "gpt-5-thinking", "quota": 3000, "hours": 168 },
    { "id": "gpt-5-pro", "quota": 15, "hours": 720 }
  ],
  "pro": [
    { "id": "gpt-5", "quota": -1, "hours": 3, "max": 160 },
    { "id": "gpt-5-thinking", "quota": -1, "hours": 168, "max": 3000 },
    { "id": "gpt-5-pro", "quota": -1, "hours": 720, "max": 15 }
  ]
}
```

### 필드 명세

| 필드 | 타입 | 설명 |
| ---- | ---- | ---- |
| `id` | string | 모델 식별자. `mapApiModelToId()`에서 매핑 기준 |
| `quota` | number | 윈도우당 최대 메시지 수. **-1 = 무제한** |
| `hours` | number | 쿼터 윈도우 시간. 3=3시간, 24=1일, 168=1주, 720=1달 |
| `max` | number (optional) | 무제한일 때 프로그레스 바 분모. 미지정시 200 |

### `models` vs 플랜별 배열

- `models`: 레거시 호환용 전체 목록. `normalizeQuotaShape`에서 fallback으로 사용
- `free/plus/team/pro`: 각 플랜에서 표시할 모델 목록. 이것이 실제로 사용됨

---

## 10. _locales - 다국어 메시지

Chrome i18n API를 사용한다. `chrome.i18n.getMessage("키")`로 현재 브라우저 언어에 맞는 메시지를 가져온다.

### 메시지 키 목록

| 키 | 용도 |
| ---- | ---- |
| `extensionName` | 확장 이름 (manifest에서 `__MSG_extensionName__`으로 참조) |
| `extensionDescription` | 확장 설명 (manifest에서 참조) |
| `period_prefix` | 기간 접두어 ("Every" / "매" / "毎" / "每") |
| `period_month` / `period_months` | 단수/복수 월 단위 |
| `period_week` / `period_weeks` | 단수/복수 주 단위 |
| `period_day` / `period_days` | 단수/복수 일 단위 |
| `period_hour` / `period_hours` | 단수/복수 시간 단위 |
| `loading` | 로딩 중 텍스트 |
| `error` | 에러 텍스트 |

### 10.1 _locales/en/messages.json (기본 로케일)

```json
{
  "extensionName": {
    "message": "ChatGPT Usage Limit Tracker"
  },
  "extensionDescription": {
    "message": "Displays usage limits and quotas for all ChatGPT models, including GPT-5, GPT-5 Thinking, and GPT-5 Pro (e.g., X msgs / X hrs)."
  },
  "period_prefix": {
    "message": "Every"
  },
  "period_month": {
    "message": "month"
  },
  "period_months": {
    "message": "months"
  },
  "period_week": {
    "message": "week"
  },
  "period_weeks": {
    "message": "weeks"
  },
  "period_day": {
    "message": "day"
  },
  "period_days": {
    "message": "days"
  },
  "period_hour": {
    "message": "hour"
  },
  "period_hours": {
    "message": "hours"
  },
  "loading": {
    "message": "Loading…"
  },
  "error": {
    "message": "Error."
  }
}
```

### 10.2 _locales/ko/messages.json (한국어)

```json
{
  "extensionName": {
    "message": "ChatGPT 사용 한도 트래커"
  },
  "extensionDescription": {
    "message": "모든 ChatGPT 모델의 사용 한도(쿼터)를 표시합니다. GPT-5, GPT-5 Thinking, GPT-5 Pro를 포함하며, 예: X시간마다 최대 X개의 메시지."
  },
  "period_prefix": {
    "message": "매"
  },
  "period_month": {
    "message": "개월"
  },
  "period_months": {
    "message": "개월"
  },
  "period_week": {
    "message": "주"
  },
  "period_weeks": {
    "message": "주"
  },
  "period_day": {
    "message": "일"
  },
  "period_days": {
    "message": "일"
  },
  "period_hour": {
    "message": "시간"
  },
  "period_hours": {
    "message": "시간"
  },
  "loading": {
    "message": "불러오는 중…"
  },
  "error": {
    "message": "오류가 발생했습니다."
  }
}
```

### 10.3 _locales/ja/messages.json (일본어)

```json
{
  "extensionName": {
    "message": "ChatGPT 使用上限トラッカー"
  },
  "extensionDescription": {
    "message": "すべての ChatGPT モデルの使用上限（クォータ）を表示します。GPT-5、GPT-5 Thinking、GPT-5 Pro を含み、例：X 時間ごとに最大 X 件のメッセージ。"
  },
  "period_prefix": {
    "message": "毎"
  },
  "period_month": {
    "message": "か月"
  },
  "period_months": {
    "message": "か月"
  },
  "period_week": {
    "message": "週"
  },
  "period_weeks": {
    "message": "週"
  },
  "period_day": {
    "message": "日"
  },
  "period_days": {
    "message": "日"
  },
  "period_hour": {
    "message": "時間"
  },
  "period_hours": {
    "message": "時間"
  },
  "loading": {
    "message": "読み込み中…"
  },
  "error": {
    "message": "エラー。"
  }
}
```

### 10.4 _locales/zh_TW/messages.json (繁體中文)

```json
{
  "extensionName": {
    "message": "ChatGPT 使用配額限制"
  },
  "extensionDescription": {
    "message": "顯示 ChatGPT 所有模型的使用狀況，包含 GPT-5、GPT-5 Thinking、GPT-5 Pro，例如每 X 小時最多發送 X 則訊息。"
  },
  "period_prefix": {
    "message": "每"
  },
  "period_month": {
    "message": "個月"
  },
  "period_months": {
    "message": "個月"
  },
  "period_week": {
    "message": "週"
  },
  "period_weeks": {
    "message": "週"
  },
  "period_day": {
    "message": "天"
  },
  "period_days": {
    "message": "天"
  },
  "period_hour": {
    "message": "小時"
  },
  "period_hours": {
    "message": "小時"
  },
  "loading": {
    "message": "載入中…"
  },
  "error": {
    "message": "發生錯誤"
  }
}
```

### 한국어/일본어/중국어 기간 표시 특성

이 언어들은 단수/복수 구분이 없으므로 `period_month`와 `period_months`의 값이 동일하다.
또한 숫자가 1이어도 항상 숫자를 표시한다: `"매 1 시간"` (영어만 1일 때 숫자 생략).

---

## 11. 전체 아키텍처 및 데이터 흐름

```text
┌───────────────────────────────────────────────────────────────────────┐
│                       chatgpt.com 웹 앱                               │
│  사용자가 메시지 전송 → POST /backend-api/conversation                  │
│  Request Body: { "model": "gpt-5", "messages": [...], ... }          │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
        webRequest.onBeforeRequest 가로챔 (background.js)
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    background.js (Service Worker)                     │
│                                                                       │
│  [감청 단계]                                                           │
│   requestBody.raw[0].bytes → UTF-8 디코딩 → JSON.parse               │
│   body.model 추출 (메시지 내용은 읽지 않음)                              │
│   mapApiModelToId() → 정규화된 모델 ID                                  │
│   timestamps_{id} 배열에 Date.now() push                              │
│   gpt-5이면 timestamps_auto에도 이중 기록                               │
│                                                                       │
│  [응답 단계 - onMessage]                                               │
│   getUsageData: 윈도우 내 타임스탬프 count → {data, plan} 응답          │
│   getActivePlan: storage에서 activePlan 반환                           │
│   setActivePlan: storage에 activePlan 저장                             │
│                                                                       │
│  [쿼터 로딩]                                                           │
│   fetchQuotaAll(): GitHub raw → 1시간 캐시 → 실패시 로컬 fallback       │
│                                                                       │
│  [정리]                                                                │
│   chrome.alarms "dailyCleanup" → 24시간마다                            │
│   최장 윈도우 * 1.5 이전 타임스탬프 삭제                                  │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                    chrome.storage.local
                                │
         ┌──────────────────────┴──────────────────────┐
         │  timestamps_gpt-5: [ts1, ts2, ...]           │
         │  timestamps_gpt-5-thinking: [ts1, ...]       │
         │  timestamps_auto: [ts1, ts2, ...]            │
         │  cachedQuotaAll: { free:[], plus:[], ... }   │
         │  lastFetchTimestamp: 1712700000000            │
         │  activePlan: "plus"                          │
         └──────────────────────┬──────────────────────┘
                                │
                    chrome.runtime.sendMessage
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                popup.js + popup.html + style.css                      │
│                                                                       │
│  1. 초기화: getActivePlan → 플랜 버튼 활성화                            │
│  2. refresh(): getUsageData → 모델별 {id, used, quota, hours, max}    │
│  3. renderRows(): 각 모델마다 DOM 생성                                  │
│     ├─ 모델명 (Free의 auto → "gpt-5"로 표시)                           │
│     ├─ 기간 배지 ("매 3 시간") — 무제한이면 숨김                         │
│     ├─ 사용량 텍스트 ("45 / 160" 또는 "45 / ∞")                        │
│     └─ 프로그레스 바 (width = used/quota * 100%)                        │
│  4. 플랜 버튼 클릭 → setActivePlan → refresh()                         │
│  5. 다크 모드: @media (prefers-color-scheme: dark) 자동 대응             │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 12. 빌드 및 설치 방법

빌드 시스템이 없다. 모든 파일이 plain JS/HTML/CSS이며 번들링 없이 직접 로드한다.

### Chrome에 설치

1. 위의 모든 파일을 하나의 폴더에 생성
2. Chrome에서 `chrome://extensions` 열기
3. "개발자 모드" 활성화
4. "압축해제된 확장 프로그램을 로드합니다" 클릭
5. 해당 폴더 선택

### 동작 확인

1. `chatgpt.com`에서 아무 메시지나 전송
2. 확장 아이콘 클릭 → 팝업에서 사용량 확인
3. 서비스 워커 콘솔(`chrome://extensions` → "서비스 워커" 클릭)에서 로그 확인:
   `Logged timestamps_gpt-5 (slug: gpt-5)`

---

## 13. 설계 원칙 요약

| 원칙 | 구현 |
| ---- | ---- |
| 프라이버시 우선 | `body.model`만 추출, 메시지 내용 미접근, 외부 전송 없음 |
| 오프라인 내성 | GitHub fetch 실패 시 로컬 quota.json fallback |
| 원격 쿼터 업데이트 | 확장 업데이트 없이 GitHub의 quota.json 변경만으로 반영 |
| 최소 저장 | 타임스탬프 배열만 저장, 24시간마다 자동 정리 |
| 무제한 모델 대응 | `quota: -1` + `max` 필드로 프로그레스 바 분모 제공 |
| 다국어 | Chrome i18n API, 4개 언어, 단수/복수 분리 |
| 다크 모드 | CSS media query 자동 대응, JS 불필요 |
| 번들링 불필요 | Plain JS/HTML/CSS, 빌드 스텝 없음 |
