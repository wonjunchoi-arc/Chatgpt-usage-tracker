# 프로젝트 철학 — ChatGPT Usage Tracker

## 왜 만들었는가

ChatGPT Business 플랜은 Enterprise급 기능을 대부분 제공하지만, **팀별/개인별 사용량 추적**이 없다.

이 기능 하나를 위해 Enterprise로 전환하면 **1인당 약 2배의 비용**이 발생한다.
수십 명 규모의 조직에서 이는 정당화되기 어렵다.

## 목적

단순한 사용량 집계가 목표가 아니다.

**기업의 AX(AI Transformation) 전환이 얼마나 잘 이루어지고 있는지 측정**하는 것이 핵심이다.

- 팀별로 AI를 얼마나 활용하고 있는가
- 어떤 기능을 주로 사용하는가 (단순 채팅 vs 파일 분석 vs 캔버스 등)
- 개인별 활용 패턴이 시간에 따라 어떻게 변화하는가

이 데이터가 있어야 조직의 AI 도입 현황을 관리자가 객관적으로 판단할 수 있다.

## 기술적 접근

ChatGPT 웹에서 사용자가 메시지를 보낼 때 브라우저는 네트워크 요청을 발생시킨다.
이 요청의 payload에는 **메시지 본문 없이도** 어떤 기능을 사용했는지 드러나는 구조적 메타데이터가 포함된다.

크롬 익스텐션의 `background.js`가 이 네트워크 요청을 **웹 레이어에서 가로채** 분석하고,
Supabase에 저장한다. 메시지 본문(`content`, `prompt` 등)은 저장하지 않는다.

```
사용자 → chatgpt.com → [background.js가 네트워크 요청 인터셉트]
                                   ↓
                         payload 메타데이터 분석
                                   ↓
                         Supabase에 activity 저장
                                   ↓
                         Dashboard에서 팀/개인별 시각화
```

## 프로젝트 구조

### 1. `chatgpt-usage-limit-tracker/` — 크롬 익스텐션

사용자 브라우저에 설치되는 익스텐션.

| 파일 | 역할 |
|------|------|
| `background.js` | 네트워크 인터셉트, payload 파싱, Supabase 저장 |
| `supabase.js` | Supabase 클라이언트 초기화 및 DB 연동 |
| `popup.js` / `popup.html` | 사용자가 보는 팝업 UI (개인 사용량 요약) |
| `options.js` / `options.html` | 익스텐션 설정 페이지 |
| `quota.json` | 모델별 사용 한도 정의 |
| `manifest.json` | 크롬 익스텐션 설정 |

### 2. `dashboard/` — 관리자 대시보드 (Next.js)

Supabase에 쌓인 데이터를 관리자가 확인하는 웹 대시보드.

- 팀별 / 개인별 사용량 시각화
- 기능별 활용 현황 (chat, canvas, file-analysis, connector 등)
- AX 전환 지표 추적

## 설계 원칙

**프라이버시 우선**
- 메시지 본문, prompt, 응답 전문은 절대 저장하지 않는다.
- 저장되는 것은 "언제, 어떤 기능을, 어떤 모델로 사용했는가"뿐이다.

**구조적 신호 우선**
- 사용 기능 분류는 메시지 내용이 아니라 payload의 구조적 메타데이터 기반으로 한다.
- (`system_hints`, `conversation_mode`, `attachments`, `selected_*` 등)

**비용 효율**
- Enterprise 전환 없이 Business 플랜으로 동일한 가시성을 확보하는 것이 목표다.
