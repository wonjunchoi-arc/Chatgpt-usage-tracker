## 제약 조건
- 문서는 실제 코드와 다른 폴더명, 함수명, 테이블명, 기능명을 만들지 않는다.
- privacy-first 원칙을 약화시키는 표현이나 예시를 추가하지 않는다.
- 메시지 본문/프롬프트/응답 전문이 포함된 예시 payload를 쓰지 않는다.
- 오래된 설계나 실험 문서는 현재 구현과 구분해서 표시한다.
- 코드 파일을 바꾸지 않고 문서만 수정한 경우 graphify code rebuild는 필수 아님.

## 이 폴더의 역할
이 폴더는 제품 철학, ChatGPT web payload 분석, 저장 전략, CLAUDE.md 작성 규칙을 담는 문서 영역이다.
코드의 source of truth를 대체하지 않고, 구현 의도와 운영 선택지를 설명한다.

## 디렉터리 지도
```text
docs/
├── CLAUDE.md
├── claude_md_writing_rules.md       # CLAUDE.md 작성 기준
├── PHILOSOPHY.md                    # 제품 철학과 privacy-first 원칙
├── chatgpt_web_payload_analysis.md  # payload 기반 기능 분류 규칙
├── HARNESS/
│   ├── CLAUDE.md
│   ├── HARNESS_ENGINEERING.md
│   └── storage_strategy_options.md
├── commit_message_convention.md     # 현재 프로젝트와 불일치 가능
└── branch_naming_convention.md      # 현재 프로젝트와 불일치 가능
```

## 작업 흐름
1. 문서가 설명하는 실제 코드/SQL/파일명을 `rg`로 확인한다.
2. payload, DB, dashboard 설명을 바꾸면 관련 코드와 schema도 함께 확인한다.
3. 오래된 폴더명 `chatgpt-usage-limit-tracker`를 새 문서에 추가하지 않는다.
4. 문서 구조나 CLAUDE.md 규칙 변경 시 `claude_md_writing_rules.md`와 루트 `CLAUDE.md`의 일관성을 확인한다.
5. 문서만 바꾼 경우 최종 응답에 graphify rebuild를 실행하지 않았다고 명시한다.

## 도구
- 파일 확인: `rg --files docs`
- 용어 검색: `rg "<term>" docs ../README.md ../chatgpt-usage-tracker ../dashboard ../supabase`
- 문서 전용 build/test 명령은 없다.

## 도메인 컨텍스트
- 핵심 개념: AX 전환 지표, 구조적 신호, minimal raw event, DB pre-aggregation, workspace Supabase.
- 핵심 흐름: ChatGPT request → extension inferActivity → sync queue → Supabase `activity_events` → trigger summary → dashboard.
- 운영 선택지는 `HARNESS/storage_strategy_options.md`에 모은다.

## 폴더별 규칙
- 문서 제목은 한국어를 우선하되 코드 식별자는 실제 이름을 그대로 쓴다.
- `@path/to/file` 라우팅 링크는 CLAUDE.md 계열 문서에서만 적극 사용한다.
- README 수준 설치 안내와 깊은 구현 세부사항을 같은 문서에 섞지 않는다.
- `commit_message_convention.md`, `branch_naming_convention.md`는 현재 프로젝트와 맞는지 확인 전 확장하지 않는다.
