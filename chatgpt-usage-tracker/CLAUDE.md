## 제약 조건
- 메시지 본문, 프롬프트, 응답 전문, `content`, `parts`, 원본 `messages`를 저장/전송/로그 출력하지 않는다.
- 네트워크 인터셉트 대상은 ChatGPT `conversation` 요청으로 제한한다.
- `config.js`는 로컬 산출물이다. 읽거나 커밋하지 않는다.
- Supabase URL/key/session은 `chrome.storage.local` 경로로만 다루고 소스에 하드코딩하지 않는다.
- sync queue 실패 시 사용자 활동을 잃지 않도록 retry 동작을 보존한다.

## 이 폴더의 역할
이 폴더는 ChatGPT 웹 요청을 감지해 구조적 사용 메타데이터를 수집하는 Manifest V3 Chrome Extension이다.
로컬 usage/cache와 sync queue를 유지하고, 인증된 사용자의 Supabase `activity_events`로 이벤트를 전송한다.

## 디렉터리 지도
```text
chatgpt-usage-tracker/
├── manifest.json          # 권한, host permission, service worker 등록
├── background.js          # request intercept, model mapping, inferActivity, queue enqueue
├── supabase.js            # workspace config, Auth REST, profile/team REST, queue flush
├── popup.html/js          # 로그인 gate, 이번 달 사용량, 최근 활동
├── options.html/js/css    # workspace 연결, 로그인, 팀 선택, 수동 동기화
├── quota.json             # 모델 catalog, aliases, quota 표시 데이터
├── _locales/ko/           # Chrome extension i18n
└── icons/                 # extension icons
```

## 작업 흐름
1. payload 분류를 바꾸기 전 `../docs/chatgpt_web_payload_analysis.md`의 우선순위를 확인한다.
2. `background.js`에서 수집하는 필드가 `supabase.js`의 insert row와 `supabase/initial_setup.sql` schema에 맞는지 확인한다.
3. storage/auth/team/sync 동작 변경은 `options.js`, `popup.js`, `supabase.js`를 함께 본다.
4. content 계열 key를 새로 탐색하거나 저장하지 않는지 확인한다.
5. 변경 후 Chrome unpacked extension으로 수동 검증한다. 자동 테스트 러너는 아직 없다.

## 도구
- 로컬 config 생성: 사용자가 명시적으로 요청한 경우에만 `node ../scripts/sync-shared-supabase-config.mjs`
- 브라우저 검증: `chrome://extensions` → 개발자 모드 → 이 폴더를 unpacked extension으로 로드
- 설정 검증: options page에서 workspace/auth/team/sync 상태 확인
- 수집 검증: ChatGPT 메시지 전송 후 popup activity와 Supabase event/summary 증가 확인

## 도메인 컨텍스트
- 저장 이벤트는 "언제, 어떤 모델로, 어떤 기능을 사용했는가"의 구조적 메타데이터다.
- `app`: `chat`, `connector`, `skill`, `canvas`, `project`, `images`, `voice`, `workspace`.
- `features`: `file-analysis`, `connector-app`, `skill-invocation`, `project-context`, `image-generation`, `search`, `pro-model` 등.
- `monthKey`는 Asia/Seoul 기준 `YYYY-MM`이다.
- Supabase insert 대상은 `activity_events`이고 DB trigger가 summary 테이블을 갱신한다.

## 폴더별 규칙
- payload 탐색 시 `SKIPPED_CONTENT_KEYS` 원칙을 유지한다.
- `inferActivity()`의 feature/app 우선순위는 payload 분석 문서와 맞춘다.
- `chrome.runtime.sendMessage` listener가 비동기 응답을 보내면 `return true`를 유지한다.
- REST insert 필드는 DB column, dedup index, RLS 정책과 함께 변경한다.
- Manifest V3 service worker 제약을 고려해 장시간 state를 전역 메모리에 의존하지 않는다.
