# ChatGPT Usage Tracker

ChatGPT Business 플랜을 사용하는 조직에서 **팀별·개인별 AI 활용도를 추적**하기 위한 오픈소스 도구입니다.

## 배경

ChatGPT Business 플랜은 Enterprise급 기능을 대부분 제공하지만, 팀별·개인별 사용량 추적 기능이 없습니다. 이를 위해 Enterprise로 전환하면 1인당 약 2배의 비용이 발생합니다.

이 프로젝트는 **Enterprise 전환 없이** 조직의 AI 활용 현황을 파악할 수 있도록, 브라우저 네트워크 레이어에서 ChatGPT 사용 데이터를 수집하고 대시보드로 시각화합니다.

## 목적

단순 사용량 집계가 아니라, **AX(AI Transformation) 전환 지표**를 측정하는 것이 핵심입니다.

- 팀별로 AI를 얼마나 활용하고 있는가
- 어떤 기능을 주로 사용하는가 (일반 채팅, 파일 분석, 캔버스, 커넥터 등)
- 개인별 활용 패턴이 시간에 따라 어떻게 변화하는가

## 프로젝트 구조

```
Chatgpt_tracker/
├── chatgpt-usage-limit-tracker/   # 크롬 익스텐션 (데이터 수집)
└── dashboard/                     # Next.js 관리자 대시보드 (데이터 시각화)
```

## 동작 원리

```
사용자가 ChatGPT 웹에서 메시지 전송
            ↓
크롬 익스텐션이 네트워크 요청 가로채기
            ↓
payload 메타데이터 분석 (메시지 본문은 저장 안 함)
            ↓
Supabase에 활동 이벤트 저장
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

[Supabase](https://supabase.com)에서 프로젝트를 생성하고 필요한 테이블을 설정합니다.

### 2. 크롬 익스텐션 설치

자세한 내용은 [`chatgpt-usage-limit-tracker/README.md`](./chatgpt-usage-limit-tracker/README.md)를 참고하세요.

### 3. 대시보드 실행

자세한 내용은 [`dashboard/README.md`](./dashboard/README.md)를 참고하세요.

## 공개 저장소 / 배포 원칙

- 실제 환경변수 파일(`.env`, `dashboard/.env.local`)은 GitHub에 올리지 않습니다.
- 공통 공개 Supabase 설정은 루트 `.env.shared`에 두고, 대시보드와 익스텐션이 함께 사용합니다.
- 대시보드 배포 시 Vercel의 **Root Directory**를 `dashboard`로 설정합니다.
- Vercel 환경변수에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 등록합니다.
- 익스텐션 실행 전 `node scripts/sync-shared-supabase-config.mjs`를 실행해 `chatgpt-usage-tracker/config.js`를 생성합니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 데이터 수집 | Chrome Extension (Manifest V3) |
| 백엔드 / DB | Supabase (PostgreSQL) |
| 대시보드 | Next.js 15, TypeScript, Tailwind CSS |
| 인증 | Supabase Auth |
