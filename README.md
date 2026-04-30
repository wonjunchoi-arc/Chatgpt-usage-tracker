# ChatGPT Usage Tracker

ChatGPT Business 플랜을 사용하는 조직에서 **팀별·개인별 AI 활용도를 추적**하기 위한 오픈소스 도구입니다.

## 배경

ChatGPT Business 플랜은 Enterprise급 기능을 대부분 제공하지만, 팀별·개인별 사용량 추적 기능이 없습니다. 이를 위해 Enterprise로 전환하면 1인당 약 2배의 비용이 발생합니다.

이 프로젝트는 **Enterprise 전환 없이** 조직의 AI 활용 현황을 파악할 수 있도록, 브라우저 네트워크 레이어에서 ChatGPT 사용 데이터를 수집하고 대시보드로 시각화합니다.

## 목적

단순 사용량 집계가 아니라, **AX(AI Transformation) 전환 지표**를 측정하는 것이 핵심입니다.

- 팀별로 AI를 얼마나 활용하고 있는가
- 어떤 기능을 주로 사용하는가 (일반 채팅, 파일 분석, 스킬, 커넥터 등)
- 개인별 활용 패턴이 시간에 따라 어떻게 변화하는가

## 프로젝트 구조

```
Chatgpt_tracker/
├── chatgpt-usage-tracker/   # 크롬 익스텐션 (데이터 수집)
├── dashboard/               # Next.js 관리자 대시보드 (데이터 시각화)
├── supabase/                # DB 초기 설정 SQL
└── scripts/                 # 공통 설정 동기화 스크립트
```

## 동작 원리

```
사용자가 ChatGPT 웹에서 메시지 전송
            ↓
크롬 익스텐션이 네트워크 요청 가로채기
            ↓
payload 메타데이터 분석 (메시지 본문은 저장 안 함)
            ↓
Supabase에 활동 이벤트 저장 + 월별·일별 집계 자동 갱신 (트리거)
            ↓
관리자 대시보드에서 팀별·개인별 시각화
```

## 설계 원칙

**프라이버시 우선**
메시지 본문(`content`, `prompt`, 응답 전문)은 절대 저장하지 않습니다. 저장되는 것은 언제, 어떤 기능을, 어떤 모델로 사용했는가의 구조적 메타데이터뿐입니다.

**구조적 신호 우선**
사용 기능 분류는 메시지 내용이 아니라 ChatGPT가 서버로 보내는 요청의 구조적 필드(`system_hints`, `conversation_mode`, `attachments` 등)를 기반으로 합니다.

**비용 효율**
Enterprise 전환 없이 Business 플랜으로 동일한 가시성을 확보하는 것이 목표입니다.

## 시작하기

### 1. Supabase 설정

[Supabase](https://supabase.com)에서 프로젝트를 생성한 뒤, SQL Editor에서 `supabase/initial_setup.sql` 전체를 실행합니다. 테이블, 인덱스, RLS 정책, 트리거, 기본 팀 데이터가 모두 한 번에 세팅됩니다.

### 2. 크롬 익스텐션 설치

자세한 내용은 [`chatgpt-usage-tracker/README.md`](./chatgpt-usage-tracker/README.md)를 참고하세요.

### 3. 대시보드 실행

자세한 내용은 [`dashboard/README.md`](./dashboard/README.md)를 참고하세요.

## 공개 저장소 / 배포 원칙

- 실제 환경변수 파일(`.env`, `dashboard/.env.local`)은 GitHub에 올리지 않습니다.
- 루트 `.env.shared`는 대시보드와 로컬 개발용 공통 설정 소스로 사용합니다.
- 대시보드 배포 시 Vercel의 **Root Directory**를 `dashboard`로 설정합니다.
- Vercel 환경변수에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 등록합니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 관리자 사용자 삭제 API에서만 쓰는 서버 전용 키이며, 브라우저·GitHub·README에 실제 값을 노출하지 않습니다.
- 익스텐션은 실행 중 `chrome.storage.local`에 저장된 회사별 Supabase 연결 정보를 사용합니다.

## 코드 수정 반영 방법

### 크롬 익스텐션

익스텐션은 Chrome Web Store에 등록되어 있습니다. 코드를 수정한 뒤 스토어에 반영하려면 아래 순서를 따릅니다.

1. `chatgpt-usage-tracker/` 내 파일 수정
2. `chatgpt-usage-tracker/manifest.json`의 `"version"` 값을 올린다 (예: `"2.3"` → `"2.4"`)
3. `chatgpt-usage-tracker/` 폴더를 zip으로 압축한다 (`.git`, `node_modules` 등 불필요한 파일 제외)
4. [Chrome Web Store 개발자 대시보드](https://chrome.google.com/webstore/devconsole)에서 해당 익스텐션 → **패키지 업로드** → zip 업로드
5. 변경 사항 설명 입력 후 **검토 제출** — 보통 수 시간~수 일 소요

#### 배포 전 로컬 검증

- `chrome://extensions` → 개발자 모드 활성화 → **압축 해제된 확장 프로그램 로드** → `chatgpt-usage-tracker/` 폴더 선택
- ChatGPT에서 메시지 전송 후 popup 활동 내역 및 Supabase `activity_events` 증가 확인

### 대시보드

대시보드는 Vercel에 배포되어 있으며, GitHub 연동으로 자동 배포됩니다.

- `main` 브랜치에 push → Vercel이 자동으로 빌드·배포
- 수동 재배포가 필요하면 [Vercel 대시보드](https://vercel.com) → 해당 프로젝트 → **Redeploy**

#### 배포 전 로컬 검증

```bash
cd dashboard
npm run lint        # 린트 확인
npm run build       # 빌드 오류 확인 (env 설정 필요)
npm run dev         # 로컬 서버로 직접 확인
```

> Vercel 프로젝트 설정: Root Directory = `dashboard`, 환경변수 `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` 등록 필요

## 기술 스택

| 영역 | 기술 |
| ---- | ---- |
| 데이터 수집 | Chrome Extension (Manifest V3) |
| 백엔드 / DB | Supabase (PostgreSQL + 트리거 기반 자동 집계) |
| 대시보드 | Next.js 15, TypeScript, Tailwind CSS |
| 인증 | Supabase Auth |
