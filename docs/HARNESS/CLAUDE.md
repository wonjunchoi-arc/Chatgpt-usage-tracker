## 제약 조건
- harness 문서는 구현 세부보다 운영 선택, 제약, 피드백 루프를 우선한다.
- "정답 하나"를 강요하지 말고 선택지와 trade-off를 분리한다.
- privacy-first 불변조건을 흐리지 않는다: 메시지 본문 저장 금지, 회사별 데이터 분리, 관리자 권한 통제.
- 저장 전략 변경 제안은 extension sync, DB schema/trigger/RLS, dashboard query 영향을 함께 적는다.
- 이 폴더 문서가 길어지면 요약 문서와 세부 문서로 분리한다.

## 이 폴더의 역할
이 폴더는 ChatGPT Usage Tracker를 조직 운영용 analytics harness로 설명하는 문서 영역이다.
저장 전략, 권한 구조, 온보딩, 실패 루프 같은 운영 선택지를 다룬다.

## 디렉터리 지도
```text
docs/HARNESS/
├── CLAUDE.md
├── HARNESS_ENGINEERING.md        # analytics harness 관점의 상위 정의
└── storage_strategy_options.md   # raw/summary/hybrid 저장 전략 비교
```

## 작업 흐름
1. 전략 문서를 바꾸기 전 현재 구현이 어떤 전략을 쓰는지 확인한다.
2. 저장 전략 문구 변경 시 `supabase/initial_setup.sql`, extension sync, dashboard query와 맞는지 확인한다.
3. 새로운 운영 정책 문서를 추가하면 `docs/CLAUDE.md`의 디렉터리 지도도 갱신한다.
4. 선택지를 쓸 때는 장점, 단점, 추천 상황, 현재 선택을 분리한다.

## 도구
- 문서 검색: `rg "<term>" . ../..`
- 코드 대조: `rg "<term>" ../../chatgpt-usage-tracker ../../supabase ../../dashboard`
- 문서 전용 build/test 명령은 없다.

## 도메인 컨텍스트
- harness는 사람이 정한 정책/제약/권한/저장 전략을 시스템이 반복 가능하게 실행하는 환경이다.
- 현재 기본 전략은 minimal raw event + DB pre-aggregation이다.
- raw event는 재현성과 디버깅을 위해 남기되 콘텐츠는 저장하지 않는다.
- Supabase trigger가 summary를 만들고 dashboard는 summary를 우선 조회한다.

## 폴더별 규칙
- 결정 문서는 "선택지 → 장점 → 단점 → 추천 상황 → 현재 선택" 순서를 선호한다.
- 운영 흐름은 numbered list로 쓴다.
- 구현 파일을 언급할 때는 관련 계층을 모두 함께 언급한다.
- 권한/정책 문서는 "누가 무엇을 할 수 있는가"를 표로 정리하는 것을 선호한다.
