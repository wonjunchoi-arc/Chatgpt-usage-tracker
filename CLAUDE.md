## 제약 조건
- 메시지 본문, 프롬프트, 전체 응답, `content`, `parts`, 원본 `messages`를 저장, 로그 출력, 화면 표시, 전송하지 않는다.
- 비밀값/로컬 설정 파일은 읽지 않는다: `.env`, `.env.shared`, `dashboard/.env.local`, `chatgpt-usage-tracker/config.js`, example/sample이 아닌 `.env.*`.
- 예시 env 파일은 읽어도 된다: `.env.example`, `.env.shared.example`, `dashboard/.env.example`.
- 하위 폴더에 `CLAUDE.md`가 있으면 해당 파일의 규칙이 이 루트 규칙보다 우선한다.
- Extension -> Supabase -> Dashboard 데이터 계약을 한쪽만 깨뜨리는 변경을 하지 않는다.
- 사용자가 명시하지 않은 삭제, 초기화, 대량 포맷팅, 설정 덮어쓰기를 하지 않는다.

## 프로젝트 소개
ChatGPT Usage Tracker는 ChatGPT Business를 쓰는 조직을 위한 privacy-first 사용량 분석 도구다.
ChatGPT 웹 앱의 구조적 사용 메타데이터를 수집하고, Supabase에 동기화한 뒤, Next.js 대시보드에서 팀/개인별 AI 활용도를 시각화한다.
목표는 콘텐츠 감시가 아니라 AX(AI Transformation) 전환 지표 측정이다.

## 디렉터리 지도
```text
.
├── chatgpt-usage-tracker/        # Chrome Extension 수집기
│   ├── CLAUDE.md                 # 익스텐션 전용 규칙
│   ├── background.js             # ChatGPT 요청 인터셉트 + 활동 추론
│   ├── supabase.js               # 워크스페이스 설정, 인증, REST 동기화 큐
│   ├── popup.*                   # 툴바 팝업 사용량/활동 UI
│   ├── options.*                 # 워크스페이스/인증/팀/동기화 설정 UI
│   └── quota.json                # 모델 catalog, alias, quota 표시 데이터
├── supabase/                     # DB schema, RLS, trigger
│   ├── CLAUDE.md
│   └── initial_setup.sql
├── dashboard/                    # Next.js 관리자 대시보드
│   ├── CLAUDE.md
│   ├── src/app/                  # App Router page/layout
│   ├── src/components/dashboard/ # 차트, 테이블, 필터, 사이드바
│   └── src/lib/                  # Supabase client, query, domain type
├── docs/                         # 제품 철학, payload 분석, harness 문서
│   ├── CLAUDE.md
│   └── HARNESS/CLAUDE.md
├── scripts/                      # 로컬 자동화와 설정 동기화
│   ├── CLAUDE.md
│   └── sync-shared-supabase-config.mjs
├── graphify-out/                 # knowledge graph 산출물
├── pyproject.toml                # Python/graphify 의존성 루트
└── README.md                     # 사람용 프로젝트 개요
```

## 작업 흐름
1. 아키텍처나 코드베이스 구조를 다루기 전 `graphify-out/GRAPH_REPORT.md`를 읽는다.
2. `graphify-out/wiki/index.md`가 있으면 raw 파일보다 wiki를 먼저 탐색한다.
3. 작업할 폴더의 가장 가까운 `CLAUDE.md`를 읽는다.
4. 수정 전에 `rg`, `rg --files`, 필요한 파일 읽기로 관련 맥락을 확인한다.
5. 검색/분석/수정 대상에서 생성물과 외부 의존성은 제외한다: `.venv/`, `dashboard/node_modules/`, `dashboard/.next/`, `graphify-out/cache/`.
6. 단순 변경이 아니면 짧은 계획을 먼저 세운다.
7. 요청을 만족하는 가장 좁은 범위로 수정한다.
8. 루트 또는 하위 `CLAUDE.md`의 관련 검증 명령을 실행한다.
9. 코드 파일이 바뀌었으면 graphify code graph를 갱신한다.

## 도구
- 파일 검색: `rg --files`
- 텍스트 검색: `rg "<pattern>"`
- 익스텐션 설정 동기화: 사용자가 명시적으로 요청한 경우에만 `node scripts/sync-shared-supabase-config.mjs`
- 대시보드 개발 서버: `cd dashboard && npm run dev`
- 대시보드 lint: `cd dashboard && npm run lint`
- 대시보드 production build: `cd dashboard && npm run build`
- Supabase 초기 설정: Supabase SQL Editor에서 `supabase/initial_setup.sql` 실행
- graphify Python 명령: uv 관리 가상환경(`.venv`)을 사용한다
- 코드 수정 후 graphify 갱신: `.venv/bin/python -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`

## 아키텍처
- 수집 계층: `chatgpt-usage-tracker/background.js`가 ChatGPT `conversation` 요청을 감지하고 payload 구조 신호로 app/features를 추론한다.
- 동기화 계층: `chatgpt-usage-tracker/supabase.js`가 `chrome.storage.local`에 워크스페이스 설정/세션/큐를 저장하고 Supabase REST로 이벤트를 전송한다.
- 저장 계층: `supabase/initial_setup.sql`이 `activity_events`, summary 테이블, RLS 정책, trigger 기반 사전 집계를 정의한다.
- 시각화 계층: `dashboard/src/lib/queries.ts`가 summary 테이블을 우선 조회하고 raw event는 fallback/detail 용도로만 사용한다.

## 도메인 컨텍스트
- source of truth는 Supabase `activity_events`와 trigger가 유지하는 summary 테이블이다.
- 저장 전략은 minimal raw event + DB pre-aggregation이다.
- 분류 신호는 `system_hints`, `conversation_mode`, `attachments`, `selected_*`, `model`, `thinking_effort`다.
- 주요 app/features는 `chat`, `connector`, `skill`, `canvas`, `project`, `workspace`, `file-analysis`, `search`, `pro-model`이다.
- 월 키는 Asia/Seoul 기준 `YYYY-MM`을 사용한다.

## 개발 원칙

**Karpathy-first, TDD-when-risky** — Think first. Change minimally. Verify with tests when behavior matters.

모든 작업은 코드를 건드리기 전에 요구사항·가정·최소 변경 범위·성공 기준을 명확히 한다.
그 안에서, 복잡하거나 회귀 위험이 있는 변경에는 TDD를 적용한다.
단순 수정이나 탐색성 프로토타입에는 TDD를 강제하지 않는다.

TDD 적용:

- 버그 수정, 비즈니스 로직, validation / 계산 / 상태 전이, 리팩토링, 회귀 위험이 큰 변경

TDD 선택적:

- UI 스타일, 문구 수정, 로그 추가, 임시 프로토타입, 실험성 코드

TDD 내 하위 원칙: mock이 아니라 실제 동작을 검증한다. 자세한 규칙은 `~/.claude/skills/tdd/` 참조.

완료 기준: TDD 대상이면 테스트 통과 / 그 외면 lint 통과 + 동작 직접 확인.

## 코딩 컨벤션

- 기존 패턴을 우선하고, 큰 리팩터보다 작고 국소적인 변경을 선호한다.
- Chrome Extension 코드는 Manifest V3 service worker 제약을 고려한다.
- Dashboard Server Component는 server Supabase client를, Client Component는 browser Supabase client를 사용한다.
- DB 변경은 schema, trigger, RLS, extension payload mapping, dashboard query 영향을 함께 검토한다.
- 각 `CLAUDE.md`는 300줄 이하로 유지하고, 긴 루트 규칙보다 폴더별 규칙을 선호한다.
