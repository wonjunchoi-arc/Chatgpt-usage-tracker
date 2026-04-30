# ChatGPT Usage Tracker — 관리자 대시보드

Supabase에 수집된 ChatGPT 사용 데이터를 팀별·개인별로 시각화하는 Next.js 관리자 대시보드입니다.

## 주요 기능

- **전체 현황** — 조직 전체 사용량 집계 및 추이
- **팀별 현황** — 팀 단위 월별 사용량, 활동 유형 분포, 기간별 추이
- **팀원 상세 보기** — 팀원 사용량 표에서 "자세히 보기" 버튼으로 채팅·파일첨부·검색 등 활동 유형별 수치 확장 표시
- **개인별 현황** — 사용자별 상세 활동 내역 및 기간별 추이
- **팀 비교** — 팀 간 사용량·활동 유형 비교
- **사용자 관리** — 관리자가 팀원 팀 배정·역할 변경·계정 삭제 (Admin 전용, Supabase Auth 계정까지 삭제)
- **팀 관리** — 관리자가 팀 생성·수정·삭제 (Admin 전용)

## 데이터 아키텍처

raw 이벤트(`activity_events`)에 직접 집계하지 않고, Supabase 트리거가 INSERT 시 자동으로 사전 집계 테이블을 갱신합니다. 대시보드는 이 집계 테이블만 읽습니다.

| 테이블 | 역할 |
|--------|------|
| `monthly_usage_summary` | 월별 × 유저 × 모델별 사용 횟수 |
| `monthly_app_summary` | 월별 × 유저 × 앱별 사용 횟수 |
| `monthly_feature_summary` | 월별 × 유저 × 기능별 사용 횟수 |
| `monthly_team_model_summary` | 월별 × 팀 × 모델별 사용 횟수 |
| `monthly_team_app_summary` | 월별 × 팀 × 앱별 사용 횟수 |
| `monthly_team_feature_summary` | 월별 × 팀 × 기능별 사용 횟수 |
| `monthly_team_active_members` | 월별 × 팀 × 활성 멤버 수 |
| `daily_activity_breakdown` | 일별 × 유저 × 활동 유형별 사용 횟수 |

## 페이지 구조

```text
/login                        # 로그인
/dashboard                    # 전체 현황 요약
/dashboard/team               # 팀별 사용량 (월별)
/dashboard/user/[userId]      # 개인별 상세 내역
/dashboard/compare            # 팀 간 비교
/dashboard/admin              # 관리자 전용 — 팀별 현황
/dashboard/admin/users        # 사용자 관리 (팀 배정, 역할, 삭제)
/dashboard/admin/teams        # 팀 관리 (생성·수정·삭제)
```

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| 데이터베이스 | Supabase (PostgreSQL + 트리거 기반 자동 집계) |
| 인증 | Supabase Auth (미들웨어 기반 세션 관리) |

## 로컬 개발 환경 설정

### 1. 의존성 설치

```bash
cd dashboard
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 아래 값을 입력합니다.
저장소에는 [`.env.example`](./.env.example)만 커밋하고, 실제 값은 GitHub에 올리지 않습니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY`는 사용자 삭제 API에서 Supabase Auth 계정을 삭제하기 위한 서버 전용 키입니다. Supabase Dashboard의 **Project Settings → API Keys**에서 확인하고, 실제 값은 `.env.local`이나 Vercel 환경 변수에만 저장합니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

## 인증 및 권한

Supabase Auth를 사용하며, 미들웨어(`middleware.ts`)가 인증되지 않은 접근을 `/login`으로 리디렉션합니다.
Admin 사용자가 `/dashboard/admin/users`에서 사용자를 삭제하면 서버 API가 `SUPABASE_SERVICE_ROLE_KEY`로 Supabase Auth 계정을 삭제하고, `profiles` 및 연결된 활동 데이터는 FK cascade로 함께 정리됩니다.

| 역할 | 접근 가능 페이지 |
|------|----------------|
| 일반 사용자 | `/dashboard`, `/dashboard/user/[본인 ID]` |
| 팀 관리자 | 위 + `/dashboard/team`, `/dashboard/compare` |
| Admin | 전체 페이지 + `/dashboard/admin` |

## 프로젝트 구조

```text
dashboard/
├── src/
│   ├── app/
│   │   ├── login/             # 로그인 페이지
│   │   └── dashboard/
│   │       ├── page.tsx       # 전체 현황
│   │       ├── team/          # 팀별 현황 (월별)
│   │       ├── user/[userId]/ # 개인별 현황
│   │       ├── compare/       # 팀 비교
│   │       └── admin/         # 관리자 페이지
│   │           ├── users/     # 사용자 관리
│   │           └── teams/     # 팀 관리
│   ├── components/            # 공통 UI 컴포넌트
│   ├── lib/
│   │   ├── queries.ts         # Supabase 쿼리 모음
│   │   ├── types.ts           # TypeScript 타입 정의
│   │   └── supabase/          # Supabase 클라이언트 설정
│   └── middleware.ts           # 인증 미들웨어
└── public/                    # 정적 파일
```

## 배포

Vercel 배포를 권장합니다.

```bash
npm run build   # 프로덕션 빌드
```

환경 변수는 Vercel 프로젝트 설정의 Environment Variables에 동일하게 입력합니다.

### Vercel 설정 체크리스트

- GitHub 저장소를 Vercel에 연결
- **Root Directory**를 `dashboard`로 설정
- Build Command는 기본값(`npm run build`) 사용
- Output 설정은 Next.js 기본값 사용
- 아래 환경 변수 등록

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
