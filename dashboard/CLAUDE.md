## 제약 조건
- 메시지 본문, 프롬프트, 응답 전문을 조회/표시/저장/로그 출력하지 않는다.
- Supabase service role key나 secret env를 클라이언트 코드, public env, UI에 넣지 않는다.
- 인증되지 않은 사용자가 `/dashboard` 하위에 접근할 수 있게 만들지 않는다.
- 관리자 기능은 `profiles.role = 'admin'` UI 체크와 Supabase RLS를 함께 고려한다.
- summary 테이블 우선 조회 원칙을 깨지 않는다. raw event는 fallback/detail 용도로만 제한한다.

## 이 폴더의 역할
이 폴더는 Supabase에 수집된 ChatGPT 사용 데이터를 팀/개인/관리자 관점으로 보여주는 Next.js 대시보드다.
Next.js App Router, Supabase SSR client, Recharts 기반 시각화가 핵심이다.

## 디렉터리 지도
```text
dashboard/
├── AGENTS.md                    # Next.js 16 관련 주의
├── package.json                 # npm scripts와 dependencies
├── next.config.ts               # shared Supabase public env 주입
├── src/app/
│   ├── login/page.tsx           # 로그인/회원가입
│   ├── dashboard/layout.tsx     # 인증, profile, sidebar shell
│   └── dashboard/**/page.tsx    # team/user/compare/admin 화면
├── src/components/dashboard/    # 차트, 테이블, 필터, 사이드바
└── src/lib/
    ├── queries.ts               # Supabase query와 summary aggregation
    ├── types.ts                 # domain type, ACTIVITY_KEYS
    └── supabase/                # server/client Supabase client
```

## 작업 흐름
1. Next.js API나 App Router 동작이 낯설면 `AGENTS.md`를 확인하고, 필요한 경우 `node_modules/next/dist/docs/`의 관련 문서만 제한적으로 읽는다.
2. 수정 대상 route의 `page.tsx`와 연결된 component, `src/lib/queries.ts`, `src/lib/types.ts`를 먼저 확인한다.
3. 데이터 shape 변경이면 Supabase schema와 extension payload mapping 영향까지 확인한다.
4. UI 변경은 실제 화면 흐름 기준으로 server/client component 경계를 확인한 뒤 수정한다.
5. 변경 후 최소 `npm run lint`를 실행한다. build는 env 접근이 허용되거나 사용자가 요청한 경우에만 실행한다.

## 도구
- 의존성 설치: `npm install`
- 개발 서버: `npm run dev`
- lint: `npm run lint`
- production build: env 접근이 허용된 경우 `npm run build`

## 도메인 컨텍스트
- 핵심 지표: total events, model distribution, app/feature usage, daily activity breakdown, active members.
- summary 테이블: `monthly_usage_summary`, `monthly_app_summary`, `monthly_feature_summary`, `monthly_team_*`, `daily_activity_breakdown`.
- `ACTIVITY_KEYS`가 activity label/color의 source of truth다.
- month key는 Asia/Seoul 기준 `getCurrentMonthKey()`를 사용한다.
- 첫 dashboard 가입자 2명은 DB trigger에서 bootstrap admin이 될 수 있다.

## 폴더별 규칙
- Server Component는 `@/lib/supabase/server`, Client Component는 `@/lib/supabase/client`를 사용한다.
- route page는 데이터 로딩과 접근 제어를 담당하고, 시각화/표/필터는 `src/components/dashboard`에 둔다.
- `queries.ts` 변경 시 summary 우선 조회와 raw fallback 경로를 함께 유지한다.
- admin UI에서 권한을 숨겨도 RLS 정책이 최종 방어선임을 전제로 작성한다.
- `dashboard/node_modules/`, `.next/`는 검색/수정 대상으로 삼지 않는다.
