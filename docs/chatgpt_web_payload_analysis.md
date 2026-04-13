# ChatGPT Web Payload Analysis Guide

## 목적

이 문서는 ChatGPT 웹에서 사용자가 메시지를 보낼 때 생성되는 요청 payload를 기준으로, 어떤 기능을 사용했는지 어떻게 구분할 수 있는지 정리한 가이드다.

이 문서의 목표는 다음 두 가지다.

1. Chrome DevTools에서 어떤 요청을 봐야 하는지 설명한다.
2. 실제 payload 필드만으로 `일반 채팅`, `커넥터 앱`, `스킬 호출`, `캔버스`, `파일 첨부`, `프로젝트`, `Pro 모델` 등을 어떻게 분류할 수 있는지 정리한다.

## 기본 원칙

ChatGPT 웹에서 기능을 구분할 때 가장 중요한 점은 다음과 같다.

- 모든 네트워크 요청이 중요한 것은 아니다.
- 핵심은 사용자의 메시지 전송 시점에 발생하는 `conversation` 요청 payload다.
- 기능 분류는 메시지 본문이 아니라 구조적 메타데이터를 기준으로 해야 한다.
- `prompt`, `parts`, `content` 본문을 읽지 않아도 상당수 기능을 구분할 수 있다.

## DevTools에서 확인하는 방법

1. `chatgpt.com`을 연다.
2. `F12`로 DevTools를 연다.
3. `Network` 탭으로 이동한다.
4. 상단 필터에 `conversation`을 입력한다.
5. `Preserve log`를 켠다.
6. 가능하면 테스트 전에 `Clear`를 눌러 로그를 비운다.
7. 기능 하나만 실행한다.
8. 리스트에서 `conversation` 요청을 클릭한다.
9. `Payload` 탭을 확인한다.

함께 참고할 수 있는 요청:

- `prepare`
- `stream_status`
- `conversations?cursor=...`
- `conversations?offset=...`

하지만 실제 분류의 핵심은 대부분 `conversation` payload에 있다.

## 가장 먼저 봐야 할 필드

`conversation` payload에서 우선적으로 보는 필드는 다음과 같다.

- `model`
- `conversation_mode`
- `system_hints`
- `messages[].metadata`
- `messages[].metadata.attachments`
- `messages[].metadata.selected_connector_ids`
- `messages[].metadata.developer_mode_connector_ids`
- `messages[].metadata.selected_sources`
- `messages[].metadata.selected_github_repos`
- `messages[].metadata.selected_all_github_repos`
- `messages[].metadata.selected_hazelnuts`
- `thinking_effort`

## 분류 우선순위

실제 분류는 아래 순서로 적용하는 것이 가장 안정적이다.

1. `system_hints`
2. `conversation_mode.kind`
3. `messages[].metadata.attachments`
4. `selected_*` 메타데이터
5. `model`
6. `thinking_effort`

이 순서를 추천하는 이유는 `system_hints`와 `conversation_mode`가 특정 기능의 의도를 가장 직접적으로 드러내기 때문이다.

## 실제 판별 규칙

### 1. 일반 채팅

다음 조건이면 일반 채팅으로 분류할 수 있다.

- `conversation_mode.kind === "primary_assistant"`
- `system_hints`가 비어 있음
- `attachments`가 없음
- connector 관련 값이 없음

예시 신호:

```json
{
  "model": "gpt-5-3",
  "conversation_mode": { "kind": "primary_assistant" },
  "system_hints": []
}
```

추천 저장값:

```json
{
  "app": "chat",
  "features": [],
  "conversationMode": "primary_assistant"
}
```

### 2. 커넥터 앱 사용

아래 신호 중 하나라도 있으면 커넥터 앱 사용으로 볼 수 있다.

- `system_hints` 안에 `connector:...`
- `messages[].metadata.system_hints` 안에 `connector:...`
- `serialization_metadata.custom_symbol_offsets[].symbol === "ecosystemMention"`
- `selected_connector_ids.length > 0`
- `developer_mode_connector_ids.length > 0`

실제 확인된 예시는 다음과 같았다.

```json
{
  "system_hints": ["connector:connector_2128aebfecb84f64a069897515042a44"],
  "messages": [
    {
      "metadata": {
        "system_hints": ["connector:connector_2128aebfecb84f64a069897515042a44"],
        "serialization_metadata": {
          "custom_symbol_offsets": [
            {
              "symbol": "ecosystemMention"
            }
          ]
        }
      }
    }
  ]
}
```

해석:

- 사용자가 `@Gmail` 같은 방식으로 앱을 멘션했다.
- payload는 앱 이름 대신 connector ID를 담을 수 있다.
- 따라서 이름보다는 `connector:` 접두사와 `ecosystemMention`이 더 신뢰할 만한 신호다.

추천 저장값:

```json
{
  "app": "connector",
  "features": ["connector-app"],
  "trigger": "ecosystem-mention",
  "connectorIds": ["connector_2128aebfecb84f64a069897515042a44"]
}
```

### 3. 스킬 호출

외부 커넥터가 아니라 ChatGPT 내부 skill/tool 계열 멘션은 별도로 구분하는 것이 좋다.

판별 조건:

- `messages[].metadata.selected_hazelnuts.length > 0`
- `serialization_metadata.custom_symbol_offsets[].symbol === "ecosystemMention"`
- `system_hints`에 `connector:`가 없음

실제 예시:

```json
{
  "messages": [
    {
      "metadata": {
        "selected_hazelnuts": ["69bb585adfa48191bab1047daa4f71a7"],
        "serialization_metadata": {
          "custom_symbol_offsets": [
            {
              "symbol": "ecosystemMention"
            }
          ]
        }
      }
    }
  ]
}
```

해석:

- 사용자가 `@model-selector` 같은 내부 skill/tool을 멘션한 경우로 볼 수 있다.
- `ecosystemMention`은 connector와 skill 모두에서 나타날 수 있으므로, `selected_hazelnuts` 존재 여부로 분리해야 한다.

추천 저장값:

```json
{
  "app": "skill",
  "features": ["skill-invocation"],
  "skillCount": 1,
  "trigger": "ecosystem-mention"
}
```

### 4. 캔버스 사용

캔버스는 `system_hints`에서 아주 직접적으로 드러난다.

판별 조건:

- `system_hints`에 `"canvas"` 포함
- 또는 `messages[].metadata.system_hints`에 `"canvas"` 포함

실제 예시:

```json
{
  "conversation_mode": { "kind": "primary_assistant" },
  "system_hints": ["canvas"]
}
```

추천 저장값:

```json
{
  "app": "canvas",
  "features": ["canvas"],
  "trigger": "system-hint"
}
```

### 5. 파일 첨부 / 파일 분석

파일 첨부는 `attachments`로 확인할 수 있다.

판별 조건:

- `messages[].metadata.attachments.length > 0`

실제 예시:

```json
{
  "messages": [
    {
      "metadata": {
        "attachments": [
          {
            "name": "OCRbench_V1.pdf",
            "mime_type": "application/pdf",
            "source": "library"
          }
        ]
      }
    }
  ]
}
```

여기서 확인 가능한 것:

- 첨부 개수
- 파일 이름
- MIME 타입
- 파일 source
- library 기반 파일인지 여부

추천 저장값:

```json
{
  "app": "workspace",
  "features": ["file-analysis"],
  "attachmentCount": 1,
  "attachmentMimeTypes": ["application/pdf"],
  "attachmentSources": ["library"]
}
```

### 6. 프로젝트 컨텍스트 사용

프로젝트 기능은 `conversation_mode.kind`에서 드러난다.

판별 조건:

- `conversation_mode.kind === "gizmo_interaction"`

실제 예시:

```json
{
  "conversation_mode": {
    "kind": "gizmo_interaction",
    "gizmo_id": "g-p-69bd0bb677f48191ac97fcac567e3690"
  }
}
```

해석:

- 일반 채팅이 아니라 특정 프로젝트 또는 전용 컨텍스트 안에서 실행된 요청이다.
- 이 payload만으로 파일 분석 여부까지 확정할 수는 없다.
- 다만 `project-context`라는 상위 분류는 확실히 가능하다.

추천 저장값:

```json
{
  "app": "project",
  "features": ["project-context"],
  "conversationMode": "gizmo_interaction",
  "gizmoId": "g-p-69bd0bb677f48191ac97fcac567e3690"
}
```

### 7. Pro 모델 사용

Pro는 기능 힌트가 아니라 모델 값으로 구분하는 것이 안전하다.

판별 조건:

- `model === "gpt-5-4-pro"`

실제 예시:

```json
{
  "model": "gpt-5-4-pro",
  "conversation_mode": { "kind": "primary_assistant" },
  "thinking_effort": "standard"
}
```

해석:

- 이 요청은 일반 채팅 흐름이다.
- 다만 사용된 모델 tier가 `Pro`다.
- 따라서 `app`보다는 `model tier` 분류로 저장하는 게 적절하다.

추천 저장값:

```json
{
  "app": "chat",
  "modelId": "gpt-5-4-pro",
  "modelTier": "pro",
  "thinkingEffort": "standard"
}
```

## 검색, 이미지 생성, 앱 연결의 구분 가능성

### 검색

공식 기능으로는 존재하지만, 지금까지 확인한 샘플 payload만으로는 검색 전용 신호를 아직 확보하지 못했다.

향후 확인할 필드:

- `system_hints`
- `tools`
- `recipient`
- `search`
- `web`
- `browse`

실제로 확인한 검색 샘플은 일반 채팅 payload와 거의 동일했다.

```json
{
  "model": "gpt-5-3",
  "conversation_mode": { "kind": "primary_assistant" },
  "system_hints": []
}
```

즉 검색은 다음 특성이 있다.

- 요청 payload만 보면 일반 채팅과 동일할 수 있다.
- 검색 여부가 후속 처리에서 결정될 수 있다.
- request 기준 분류만으로는 정확도가 낮다.
- search 판별은 `response metadata`, `tool execution`, `citations` 쪽을 함께 봐야 한다.

### 이미지 생성

이미지 생성도 아직 샘플 payload가 부족하다. 다만 아래 신호를 우선 확인하면 된다.

- `image`
- `generate`
- `dall`
- 이미지 관련 `tool` 값
- 이미지 attachment 또는 output 관련 메타데이터

### 앱 연결

앱 연결은 현재까지는 `system_hints`의 `connector:`와 `ecosystemMention`이 가장 신뢰도 높은 신호였다.

즉 `selected_connector_ids`만 보면 놓칠 수 있다.

또한 `ecosystemMention`은 connector 전용이 아니다.

- `connector:`와 함께 나타나면 외부 앱/커넥터
- `selected_hazelnuts`와 함께 나타나면 내부 skill/tool 호출

## 실무용 분류 규칙 요약

아래 순서대로 판별하면 된다.

### 최우선 규칙

- `system_hints`에 `connector:` 포함 → `connector-app`
- `selected_hazelnuts.length > 0` → `skill-invocation`
- `system_hints`에 `canvas` 포함 → `canvas`
- `conversation_mode.kind === "gizmo_interaction"` → `project`
- `attachments.length > 0` → `file-analysis`

### 보조 규칙

- `custom_symbol_offsets[].symbol === "ecosystemMention"` → 멘션 기반 호출
- `selected_github_repos.length > 0` → GitHub 컨텍스트
- `selected_all_github_repos === true` → 전체 GitHub 컨텍스트
- `selected_sources.length > 0` → 소스 컨텍스트
- `model`이 `*-pro`로 끝남 → Pro tier

### 마지막 fallback

- 위 규칙이 모두 아니고 `conversation_mode.kind === "primary_assistant"` → `plain-chat`

## 실제 코드에 반영할 때의 저장 전략

현재 구현은 `하나의 request = 하나의 activity event`로 기록하고, 그 안에 `대표 app 1개`와 `복수 features`를 함께 저장하는 구조를 권장한다.

예를 들어:

- 프로젝트 컨텍스트 안에서
- 커넥터 앱을 사용하고
- 파일도 첨부했다면

이벤트는 이런 식이 된다.

```json
{
  "app": "connector",
  "features": ["project-context", "connector-app", "file-analysis"],
  "conversationMode": "gizmo_interaction",
  "attachmentCount": 1,
  "connectorCount": 1
}
```

이 구조의 의미:

- `app`은 대표 활동 1개를 보여준다.
- `features`는 실제로 동시에 일어난 세부 활동을 모두 기록한다.
- 따라서 `프로젝트에서 앱 사용` 같은 복합 상황도 손실 없이 표현할 수 있다.

권장 저장 필드:

- `ts`
- `modelId`
- `modelTier`
- `conversationMode`
- `app`
- `features`
- `systemHints`
- `connectorIds`
- `skillIds`
- `gizmoId`
- `attachmentCount`
- `attachmentMimeTypes`
- `attachmentSources`
- `sourceCount`
- `githubRepoCount`
- `selectedAllGithubRepos`
- `thinkingEffort`

권장 비저장 필드:

- 메시지 본문
- prompt text
- 응답 전문

## 한계

이 방식은 매우 유용하지만 완벽하지는 않다.

- 모든 기능이 항상 같은 필드로 드러나지는 않는다.
- 검색은 request payload만으로는 일반 채팅과 구분되지 않을 수 있다.
- 이미지 생성은 샘플이 더 필요하다.
- 앱 이름은 payload에 직접 안 나오고 connector ID로만 나올 수 있다.
- skill 이름도 payload에 직접 안 나오고 내부 ID만 남을 수 있다.
- 프로젝트 컨텍스트는 알 수 있어도 그 안에서 어떤 파일을 참조했는지는 추가 신호가 필요하다.

즉 분류기는 `확실한 구조적 신호 우선`, `애매한 추론 최소화` 원칙으로 설계해야 한다.

## 추천 검증 시나리오

새 기능을 분석할 때는 아래 순서로 테스트하는 것이 좋다.

1. `Clear`로 로그 초기화
2. 기능 하나만 실행
3. `conversation` 요청 선택
4. `Payload` 확인
5. 아래 값만 비교

- `model`
- `conversation_mode`
- `system_hints`
- `messages[].metadata`
- `attachments`
- `selected_*`
- `thinking_effort`

이렇게 하면 메시지 본문을 읽지 않고도 대부분의 ChatGPT 웹 기능을 비교 분석할 수 있다.
