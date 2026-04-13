# ChatGPT Usage Tracker — 크롬 익스텐션

ChatGPT 웹에서의 사용 활동을 네트워크 레이어에서 수집하여 Supabase에 저장하는 크롬 익스텐션입니다.

## 동작 방식

ChatGPT 웹에서 메시지를 전송하면 브라우저가 `chatgpt.com`으로 네트워크 요청을 보냅니다. 익스텐션의 `background.js`가 이 요청을 가로채 payload의 구조적 메타데이터를 분석하고, Supabase에 활동 이벤트를 기록합니다.

**저장하는 것**
- 사용 시각
- 사용 모델 (`gpt-5.3-instant`, `gpt-5.4-thinking`, `gpt-5.4-pro` 등)
- 사용 기능 (`chat`, `canvas`, `file-analysis`, `connector`, `image-generation` 등)
- 플랜 정보, 팀 정보

**저장하지 않는 것**
- 메시지 본문
- 프롬프트 내용
- AI 응답 전문

## 파일 구조

```
chatgpt-usage-limit-tracker/
├── manifest.json      # 익스텐션 설정 (권한, 아이콘, 서비스 워커 등록)
├── background.js      # 핵심 로직 — 네트워크 인터셉트, 데이터 파싱, Supabase 저장
├── supabase.js        # Supabase 클라이언트 초기화 및 DB 연동
├── popup.html         # 툴바 아이콘 클릭 시 나타나는 팝업 UI
├── popup.js           # 팝업 UI 로직 — 개인 사용량 요약 표시
├── options.html       # 익스텐션 설정 페이지 UI
├── options.js         # 설정 페이지 로직 — 로그인, 팀 선택, 동기화 설정
├── style.css          # 팝업 스타일
├── options.css        # 설정 페이지 스타일
├── quota.json         # 모델별 사용 한도 정의
├── _locales/ko/       # 한국어 메시지 (익스텐션 이름, 설명)
└── icons/             # 익스텐션 아이콘 (16px, 48px, 128px)
```

## 주요 기능

### 기능 자동 분류

사용자가 어떤 ChatGPT 기능을 사용했는지 payload의 구조를 보고 자동으로 분류합니다.

| 분류 기준 | 감지하는 기능 |
|-----------|---------------|
| `system_hints`에 `canvas` | 캔버스 사용 |
| `system_hints`에 `connector:` | 외부 앱 연결 (Gmail, Notion 등) |
| `selected_hazelnuts` 존재 | 내부 스킬 호출 |
| `attachments` 존재 | 파일 첨부·분석 |
| `conversation_mode.kind === "gizmo_interaction"` | 프로젝트 컨텍스트 |
| `model`이 `-pro`로 끝남 | Pro 모델 사용 |

### 사용량 한도 추적

`quota.json`에 정의된 모델별 한도를 기준으로 남은 사용량을 팝업에 표시합니다.

### Supabase 동기화

수집된 활동 이벤트를 로컬에 임시 저장한 뒤 Supabase로 비동기 동기화합니다. 네트워크 오류 시 재시도 큐를 유지합니다.

## 설치 방법

### 1. 환경 변수 설정

`supabase.js`에 Supabase 연결 정보를 입력합니다.
공개 저장소에는 실제 값을 커밋하지 말고, 배포/배포 전 설정 단계에서만 채워 넣는 것을 권장합니다.

```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

`manifest.json`의 `host_permissions`는 `*.supabase.co`로 열려 있으므로, 프로젝트 URL을 바꿔도 추가 수정 없이 사용할 수 있습니다.

### 2. 크롬에 로드

1. 크롬 브라우저에서 `chrome://extensions` 접속
2. 우측 상단 **개발자 모드** 활성화
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. `chatgpt-usage-limit-tracker/` 폴더 선택

### 3. 익스텐션 설정

1. 툴바의 익스텐션 아이콘 우클릭 → **옵션** 클릭
2. 이메일·비밀번호로 로그인 (Supabase Auth)
3. 소속 팀 선택
4. 동기화 활성화 확인

## 사용 방법

설치 후 평소처럼 `chatgpt.com`을 사용하면 됩니다. 별도 조작 없이 백그라운드에서 자동으로 수집됩니다.

**팝업에서 확인 가능한 정보**
- 오늘 사용한 모델별 횟수
- 남은 한도
- 마지막 동기화 시각

**설정 페이지에서 가능한 것**
- 계정 로그인 / 로그아웃
- 팀 변경
- 강제 동기화 실행
- 동기화 큐 상태 확인

## 권한 설명

| 권한 | 이유 |
|------|------|
| `webRequest` | ChatGPT 네트워크 요청 감지 |
| `storage` | 로컬 캐시 및 동기화 큐 저장 |
| `alarms` | 주기적 동기화 스케줄링 |
| `host: chatgpt.com` | ChatGPT 요청 접근 |
| `host: supabase.co` | Supabase API 호출 |
