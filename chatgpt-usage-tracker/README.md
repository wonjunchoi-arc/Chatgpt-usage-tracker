# ChatGPT Usage Tracker — 크롬 익스텐션

ChatGPT 웹에서의 사용 활동을 네트워크 레이어에서 수집하여 Supabase에 저장하는 크롬 익스텐션입니다.

## 동작 방식

ChatGPT 웹에서 메시지를 전송하면 브라우저가 `chatgpt.com`으로 네트워크 요청을 보냅니다. 익스텐션의 `background.js`가 이 요청을 가로채 payload의 구조적 메타데이터를 분석하고, Supabase에 활동 이벤트를 월별 키(`YYYY-MM`) 기준으로 기록합니다.

**저장하는 것**
- 사용 시각 및 월별 키
- 사용 모델 (`gpt-4o`, `o1`, `o3-mini` 등)
- 사용 기능 (`chat`, `file-analysis`, `connector-app`, `skill-invocation`, `image-generation` 등)
- 팀 정보 (로그인 시 선택)

**저장하지 않는 것**
- 메시지 본문
- 프롬프트 내용
- AI 응답 전문

## 파일 구조

```
chatgpt-usage-tracker/
├── manifest.json      # 익스텐션 설정 (권한, 아이콘, 서비스 워커 등록)
├── background.js      # 핵심 로직 — 네트워크 인터셉트, 데이터 파싱, Supabase 저장
├── supabase.js        # chrome.storage.local 기반 Supabase 연결 및 DB 연동
├── popup.html         # 툴바 아이콘 클릭 시 나타나는 팝업 UI
├── popup.js           # 팝업 UI 로직 — 동기화 상태 및 이번 달 사용량 표시
├── options.html       # 익스텐션 설정 페이지 UI
├── options.js         # 설정 페이지 로직 — 로그인, 팀 선택, 동기화 설정
├── style.css          # 팝업 스타일
├── options.css        # 설정 페이지 스타일
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
| `web_search_enabled` 활성화 | 검색 사용 |

### 월별 적재 구조

이벤트는 `YYYY-MM` 형태의 `month_key`와 함께 저장됩니다. Supabase 트리거가 INSERT 즉시 월별·일별 집계 테이블을 자동 갱신하므로, 대시보드는 raw 이벤트를 직접 집계하지 않습니다.

### Supabase 동기화

수집된 활동 이벤트를 로컬에 임시 저장한 뒤 Supabase로 비동기 동기화합니다. 네트워크 오류 시 재시도 큐를 유지합니다.

## 설치 방법

### 1. 크롬에 로드

1. 크롬 브라우저에서 `chrome://extensions` 접속
2. 우측 상단 **개발자 모드** 활성화
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. `chatgpt-usage-tracker/` 폴더 선택

### 2. 회사 연결 설정

1. 툴바의 익스텐션 아이콘 우클릭 → **옵션** 클릭
2. 회사별 Supabase URL과 anon key 입력
3. 필요하면 회사 이름을 함께 입력
4. 연결 저장

### 3. 익스텐션 로그인

1. 이메일·비밀번호로 로그인 또는 회원가입 (Supabase Auth)
2. 소속 팀 선택
3. 동기화 활성화 확인

## 사용 방법

설치 후 평소처럼 `chatgpt.com`을 사용하면 됩니다. 별도 조작 없이 백그라운드에서 자동으로 수집됩니다.

**팝업에서 확인 가능한 정보**
- 이번 달 총 사용 횟수
- 마지막 동기화 시각
- 동기화 큐 상태

**설정 페이지에서 가능한 것**
- 회사별 Supabase 연결 정보 저장 / 변경 / 해제
- 계정 로그인 / 로그아웃
- 팀 변경
- 강제 동기화 실행

## 권한 설명

| 권한 | 이유 |
|------|------|
| `webRequest` | ChatGPT 네트워크 요청 감지 |
| `storage` | 로컬 캐시 및 동기화 큐 저장 |
| `alarms` | 주기적 동기화 스케줄링 |
| `host: chatgpt.com` | ChatGPT 요청 접근 |
| `host: supabase.co` | Supabase API 호출 |
