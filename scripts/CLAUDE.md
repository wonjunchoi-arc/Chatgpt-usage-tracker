## 제약 조건
- 스크립트는 실제 비밀값을 출력하거나 커밋하지 않는다.
- 로컬 env/config를 읽는 스크립트는 사용자가 명시적으로 요청한 경우에만 실행한다.
- 생성된 `chatgpt-usage-tracker/config.js`는 로컬 산출물이며 읽거나 커밋하지 않는다.
- 프로젝트 자동화 스크립트는 가능한 idempotent하게 작성한다.
- 실험 스크립트는 운영 경로와 구분하고, 필요하면 실험 성격을 문서화한다.

## 이 폴더의 역할
이 폴더는 로컬 개발과 온보딩을 돕는 보조 자동화 스크립트 영역이다.
현재 핵심 스크립트는 공유 Supabase public env를 extension config로 동기화하는 작업이다.

## 디렉터리 지도
```text
scripts/
├── CLAUDE.md
├── sync-shared-supabase-config.mjs  # shared/dashboard env → extension config.js 생성
└── test_claude_api.py               # untracked 실험 스크립트로 보이며 정리 필요
```

## 작업 흐름
1. 스크립트가 어떤 파일을 읽고 쓰는지 먼저 확인한다.
2. env/config를 읽는 스크립트는 사용자 요청 없이 실행하지 않는다.
3. 생성 파일이 `.gitignore` 대상인지 확인한다.
4. 스크립트 변경 시 없는 파일, 누락 key, 잘못된 경로에 대한 실패 메시지를 확인한다.
5. Python 스크립트는 루트 `pyproject.toml`과 `.venv` 사용 여부를 확인한다.

## 도구
- Extension config 생성: 사용자가 명시적으로 요청한 경우에만 `node scripts/sync-shared-supabase-config.mjs`
- Graphify code rebuild: 코드 파일 변경 후 루트에서 `.venv/bin/python -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`
- 파일 검색: `rg --files scripts`

## 도메인 컨텍스트
- Dashboard와 Extension은 같은 Supabase project를 바라봐야 한다.
- 공유 env의 public key는 anon key이며 service role key를 다루지 않는다.
- 이 폴더의 목적은 반복 가능한 로컬 설정과 온보딩 비용 감소다.

## 폴더별 규칙
- Node 스크립트는 ESM(`.mjs`)을 유지한다.
- 파일 경로는 repo root 기준으로 계산한다.
- env parser는 단순 `KEY=value`만 처리한다. 복잡한 env 문법 지원을 추가하면 검증도 추가한다.
- 에러 메시지는 필요한 파일과 key를 명확히 알려야 한다.
