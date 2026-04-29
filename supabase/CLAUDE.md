## 제약 조건
- 메시지 본문, 프롬프트, 응답 전문을 담는 컬럼을 추가하지 않는다.
- schema 변경 시 extension payload mapping, dashboard query, RLS, trigger를 함께 검토한다.
- `activity_events` insert 권한과 admin 전용 mutation 정책을 느슨하게 만들지 않는다.
- summary 테이블을 source of truth로 만들지 않는다. source of truth는 raw event + trigger다.
- bootstrap admin 로직은 동시 가입 race condition을 막아야 한다.

## 이 폴더의 역할
이 폴더는 Supabase 프로젝트의 초기 schema, RLS 정책, trigger 기반 집계를 정의한다.
`initial_setup.sql` 하나로 팀/프로필/활동 이벤트/summary table/인증 trigger를 구성한다.

## 디렉터리 지도
```text
supabase/
├── CLAUDE.md
└── initial_setup.sql
    ├── teams, profiles
    ├── activity_events
    ├── daily_activity_breakdown
    ├── monthly_*_summary
    ├── sync_monthly_activity_summaries()
    ├── is_admin()
    └── handle_new_user()
```

## 작업 흐름
1. table/column 변경 전 extension `supabase.js` insert row와 dashboard `queries.ts` select 필드를 확인한다.
2. `activity_events` 변경이면 `sync_monthly_activity_summaries()`와 backfill insert 구간을 함께 확인한다.
3. 권한 변경이면 `is_admin()`, profiles role, dashboard admin UI를 함께 본다.
4. SQL은 새 Supabase 프로젝트나 staging에서 재실행 가능성을 우선 고려한다.
5. 변경 후 dashboard build/lint와 extension insert 수동 검증 필요 여부를 기록한다.

## 도구
- 초기 적용: Supabase SQL Editor에서 `initial_setup.sql` 전체 실행
- Dashboard 검증: env 접근이 허용된 경우 `cd ../dashboard && npm run build`, 아니면 `cd ../dashboard && npm run lint`
- Extension 검증: 로그인 후 activity insert, summary 증가, RLS 접근 확인

## 도메인 컨텍스트
- `activity_events`는 제한된 raw event이며 콘텐츠가 아닌 구조적 메타데이터만 저장한다.
- `month_key`는 extension에서 Asia/Seoul 기준 `YYYY-MM`으로 만든다.
- 월별/일별 summary는 dashboard의 기본 조회 경로다.
- 팀 summary는 event insert 시점의 `profiles.team_id`를 기준으로 누적된다.
- seed team 목록은 운영 조직 의존성이 있다.

## 폴더별 규칙
- table/column 이름은 snake_case를 유지한다.
- trigger upsert는 `ON CONFLICT`와 unique constraint를 항상 짝으로 관리한다.
- RLS policy 이름은 대상과 역할이 드러나게 작성한다.
- `SECURITY DEFINER` 함수는 `SET search_path = public`을 유지한다.
- 운영 조직에 묶인 seed data를 일반화할지 여부를 변경 설명에 남긴다.
