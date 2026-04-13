# tmux Usage Guide

현재 저장된 `~/.tmux.conf` 기준으로 자주 쓰는 사용법을 정리한다.

## Prefix

- `Ctrl+b` -> tmux 명령 시작

예시

- `Ctrl+b -> c` -> 새 창 생성
- `Ctrl+b -> d` -> 세션 분리

## Session

- `tmux new -s claude` -> `claude` 이름으로 새 세션 생성
- `tmux ls` -> 세션 목록 확인
- `tmux attach -t claude` -> `claude` 세션에 다시 접속
- `tmux kill-session -t claude` -> `claude` 세션 종료

## Window

- `Ctrl+b -> c` -> 새 창 생성
- `Ctrl+b -> n` -> 다음 창으로 이동
- `Ctrl+b -> p` -> 이전 창으로 이동
- `Ctrl+b -> 1` -> 1번 창으로 이동
- `Ctrl+b -> 2` -> 2번 창으로 이동

- 창 번호는 `1`부터 시작하도록 설정되어 있음

## Pane

- `Ctrl+b -> l` -> 좌우 분할
- `Ctrl+b -> u` -> 상하 분할
- `Ctrl+b -> h` -> 왼쪽 패널로 이동
- `Ctrl+b -> j` -> 아래 패널로 이동
- `Ctrl+b -> k` -> 위 패널로 이동
- `Ctrl+b -> Right` -> 오른쪽 패널로 이동
- `exit` -> 현재 패널 닫기
- `Ctrl+d` -> 현재 쉘 종료 후 패널 닫기
- `Ctrl+b -> x` -> 현재 패널 강제 종료

## Reload

- `Ctrl+b -> r` -> `~/.tmux.conf` 다시 불러오기

## 기타 설정

- 마우스 선택 사용 가능
- 마우스 스크롤 사용 가능
- 히스토리 버퍼는 `50000`줄

## 기본 흐름

```bash
tmux new -s claude
```

작업 중 잠깐 빠질 때

```text
Ctrl+b -> d
```

다시 들어올 때

```bash
tmux attach -t claude
```
