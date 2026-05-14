# Plan: 리치 선언 기능 (riichi)

**Status**: Draft  
**Created**: 2026-05-14  
**Feature**: riichi  
**Phase**: Plan

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Problem** | 현재 게임은 완성된 역의 보상은 강화됐지만, 리치마작의 핵심 의사결정인 "텐파이 상태에서 손패를 고정하고 승부를 건다"는 선택지가 없다. |
| **Solution** | 14장 손패 중 1장을 교체하면 화료 가능한 상태를 리치 가능 상태로 판정하고, 리치 선언 후에는 손패를 고정한 채 지정된 1장만 자동 교체한다. |
| **UX 효과** | 플레이어가 "계속 직접 교체할지", "손패를 고정하고 리치 보상을 노릴지"를 선택하게 되어 라운드 후반의 긴장감과 보상 체감이 커진다. |
| **핵심 가치** | 리치마작다운 전략성을 추가하면서도 현재 로그라이트식 교체 규칙을 크게 흔들지 않는다. |

---

## 1. 기능 정의

### 1.1 리치 가능 조건

이 프로젝트의 리치는 실제 리치마작의 13장 텐파이 구조를 그대로 쓰지 않고, 현재 게임 규칙에 맞게 다음처럼 정의한다.

```text
현재 14장 손패에서 특정 1장을 다른 패 1장으로 교체했을 때 화료 가능한 상태
```

즉, 14장 손패 기준으로 각 패를 하나씩 제거 후보로 삼고, 그 자리에 34종의 모든 패를 넣어 보았을 때 `scoreHand()` 또는 `analyzeHand()` 결과가 화료 가능하면 리치 버튼을 활성화한다.

### 1.2 리치 선언 후 동작

리치를 선언하면 다음 상태가 적용된다.

- 손패 전체를 고정한다.
- 리치 판정에서 찾은 교체 대상 패 1장만 교체 대상으로 삼는다.
- 일반 패 선택과 여러 장 교체는 막는다.
- 남은 교체 횟수를 사용해 교체 대상 패 1장만 자동으로 교체한다.
- 교체 결과 화료가 되면 리치 보상을 포함해 점수를 계산한다.
- 남은 교체 횟수를 모두 사용해도 화료하지 못하면 기존 실패 흐름으로 들어간다.

### 1.3 추천 UX

리치 선언 후에는 플레이어가 매번 누르는 방식보다, 선언 즉시 남은 교체 횟수만큼 자동 진행하는 방식이 더 명확하다.

```text
리치 선언 클릭
  -> 자동으로 1장 교체
  -> 화료 확인
  -> 실패 시 남은 횟수만큼 반복
  -> 화료 성공 또는 라운드 실패
```

자동 진행 결과 메시지에는 몇 번 만에 화료했는지, 어떤 대기패로 완성됐는지를 표시한다.

---

## 2. 상태 설계

### 2.1 게임 상태 추가

`newRun()`, `newTutorial()`, `startRound()`에서 다음 형태의 리치 상태를 초기화한다.

```js
riichi: {
  active: false,
  exchangeTileId: null,
  waits: [],
  attemptsUsed: 0,
}
```

| 필드 | 설명 |
|------|------|
| `active` | 리치 선언 여부 |
| `exchangeTileId` | 리치 선언 후 자동 교체할 패의 `copyId` |
| `waits` | 이 패를 교체했을 때 화료 가능한 대기패 목록 |
| `attemptsUsed` | 리치 자동 교체에 사용한 횟수 |

### 2.2 점수 계산 컨텍스트

`scoreHand()`에 네 번째 인자로 컨텍스트를 추가한다.

```js
scoreHand(tiles, dora, relics = [], context = {})
```

리치 화료 시에는 다음처럼 호출한다.

```js
scoreHand(hand, dora, relics, {
  riichi: true,
  riichiAttemptsUsed: state.riichi.attemptsUsed,
  discardsLeft: state.discardsLeft,
})
```

`evaluateYaku()`는 이미 `context = {}` 인자를 받을 수 있으므로, 리치 역은 이 컨텍스트를 통해 판정한다.

---

## 3. 판정 설계

### 3.1 신규 함수

`src/game.js` 또는 별도 모듈 `src/game/riichi.js`에 다음 함수를 둔다.

```js
export function getRiichiState(hand, availableTiles = null) {
  return {
    canRiichi: true,
    exchangeTileId: "m5-0-...",
    waits: [{ suit: "m", value: 3 }],
  };
}
```

별도 모듈을 추천한다. 이유는 리치 판정이 14장 손패의 모든 제거 후보와 34종 후보패를 탐색하므로 `game.js`에 직접 넣으면 라운드 진행 로직과 섞이기 쉽기 때문이다.

### 3.2 탐색 방식

```text
for each tile in hand:
  keep = hand - tile
  for each face in 34 tile faces:
    candidate = keep + face
    if candidate is complete and has at least one yaku:
      record tile as riichi discard candidate
      record face as wait
```

초기 구현에서는 첫 번째 후보만 사용해도 된다. 다만 UI와 밸런스를 고려하면 다음 우선순위로 후보를 고르는 것이 좋다.

1. 완성 시 점수가 가장 높은 후보
2. 대기패 종류가 많은 후보
3. 현재 손패 정렬 기준으로 앞쪽에 있는 후보

### 3.3 화료 인정 기준

리치 대기 판정은 `analysis.isComplete`를 기준으로 본다. 리치 선언 자체가 1판역이 되므로, 다른 역이 없는 완성형이라도 리치 상태에서는 화료할 수 있어야 한다.

```js
const score = scoreHand(candidate, dora, relics, { riichi: true, riichiPreview: true });
const canWin = score.isComplete;
```

이렇게 해야 "리치만으로 역을 충족한다"는 규칙이 UI 활성화와 실제 화료 판정에서 일관되게 적용된다.

---

## 4. 액션 설계

### 4.1 신규 액션

`src/game.js`에 다음 액션을 추가한다.

```js
export function declareRiichi(state) {
  // 1. canAct 확인
  // 2. getRiichiState 확인
  // 3. 리치 상태 설정
  // 4. 자동 교체 실행
}
```

자동 진행은 별도 함수로 분리한다.

```js
function resolveRiichi(state) {
  // 남은 교체 횟수 동안 1장씩 자동 교체
  // 매 시도마다 scoreHand(..., { riichi: true }) 확인
  // 성공하면 submitHand와 같은 통과/보상/승리 흐름으로 연결
  // 실패하면 lost 처리
}
```

### 4.2 기존 액션 제한

리치 상태에서는 다음을 제한한다.

- `toggleTile()`은 아무 동작도 하지 않는다.
- `exchangeSelected()`는 사용할 수 없다.
- `submitHand()`는 리치 자동 진행에서 화료했을 때만 호출되거나, 리치 성공 결과를 직접 처리한다.

`canAct()` 자체를 막으면 제출/해결 흐름까지 막힐 수 있으므로, 액션별로 리치 상태를 확인하는 편이 안전하다.

---

## 5. UI 설계

### 5.1 버튼

`src/ui/render/game.js`의 actions 영역에 리치 버튼을 추가한다.

```html
<button data-action="declare-riichi" disabled>리치</button>
```

활성 조건:

- 현재 상태가 `playing`
- 리치 상태가 아님
- 남은 교체 횟수가 1 이상
- `getRiichiState(...).canRiichi === true`

튜토리얼에서는 우선 비활성화하거나 숨기는 것을 추천한다. 기존 튜토리얼은 단일 교체 학습에 집중하고 있어 리치까지 넣으면 학습 목표가 흐려진다.

### 5.2 표시 정보

리치 가능 상태일 때는 메시지 또는 보조 텍스트에 다음을 표시한다.

```text
리치 가능: 1장을 고정 교체하면 화료를 노릴 수 있습니다.
```

리치 선언 후 자동 진행 결과:

```text
리치 성공! 3회 교체 끝에 5만 대기로 화료했습니다.
```

실패:

```text
리치 실패. 남은 교체 횟수 안에 대기패를 가져오지 못했습니다.
```

---

## 6. 보상 설계

### 6.1 기본 보상

리치 화료 시 다음 보상을 적용한다.

| 보상 | 값 |
|------|----|
| 리치 역 | 1판 |
| 역 배수 보너스 | `+0.75` |

리치 자체는 `yaku-data.js`의 기존 정의를 활성화하고, `yaku-rules.js`에서 `context.riichi === true`일 때 판정한다.

### 6.2 남은 교체 횟수 보상

리치가 너무 운에만 기대지 않도록, 빠르게 완성했을 때 추가 보상을 준다.

```js
const riichiBonus = Math.min(1.5, 0.75 + discardsLeftAfterWin * 0.1);
```

추천 적용 위치는 `yakuMultiplierBonus`다. `globalMultiplierBonus`에 직접 더하면 기존 유물과 곱연산 체감이 지나치게 커질 수 있다.

### 6.3 밸런스 기준

- 리치는 손패를 고정하는 리스크가 있으므로 일반 1판역보다 보상이 커야 한다.
- 다만 자동 교체가 실패하면 바로 라운드 실패로 이어지므로, 선언 버튼이 항상 정답이 되지는 않아야 한다.
- `+0.75`는 현재 유물의 희귀급 배율 보너스와 비슷한 체감이므로 시작값으로 적절하다.

---

## 7. 구현 순서

1. `src/game/riichi.js`를 추가해 34종 패 후보와 리치 가능 판정을 구현한다.
2. `scoreHand()`와 `evaluateYaku()`에 리치 컨텍스트 전달을 연결한다.
3. `yaku-data.js`의 기존 리치 정의를 `implemented: true`로 전환하고, `yaku-rules.js`에 리치 판정 규칙을 연결한다.
4. `game.js`에 `declareRiichi()`와 자동 리치 해결 흐름을 추가한다.
5. `toggleTile()`, `exchangeSelected()`에서 리치 상태일 때의 제한을 추가한다.
6. `src/ui/events.js`에 `declare-riichi` 액션을 연결한다.
7. `src/ui/render/game.js`에 리치 버튼과 상태 메시지를 추가한다.
8. `scripts/check-yaku.mjs` 또는 신규 체크 스크립트에 리치 판정 테스트를 추가한다.
9. `npm run check`와 `npm run build`로 회귀를 확인한다.

---

## 8. 테스트 계획

| 케이스 | 기대 결과 |
|--------|----------|
| 1장만 바꾸면 탕야오 완성 | 리치 버튼 활성화 |
| 완성은 되지만 역이 없는 대기 | 리치 버튼 활성화, 리치 성공 시 화료 가능 |
| 이미 완성된 손패 | 리치 버튼 비활성화 또는 제출 우선 |
| 리치 선언 후 대기패를 뽑음 | 리치 역과 배율 보너스가 적용되고 라운드 통과 판정 |
| 리치 선언 후 끝까지 실패 | 라운드 실패 |
| 리치 상태에서 패 선택 클릭 | 선택 상태 변화 없음 |
| 리치 상태에서 일반 교체 클릭 | 교체되지 않음 |
| 튜토리얼 상태 | 리치 버튼 숨김 또는 비활성화 |

---

## 9. 검토 결과

### 9.1 구현 타당성

현재 코드 구조에는 리치 기능을 얹기 좋은 지점이 이미 있다.

- `evaluateYaku(tiles, analysis, context = {})`가 컨텍스트 인자를 이미 받는다.
- `yaku-data.js`에는 `riichi` 정의가 이미 있으므로 구현 시 활성화하면 된다.
- `scoreHand()`가 점수와 배율을 한 곳에서 계산한다.
- `exchangeSelected()`와 `submitHand()`가 라운드 흐름의 명확한 진입점이다.
- UI 액션이 `data-action` 기반이라 버튼 추가가 단순하다.

따라서 리치 기능은 대규모 리팩터링 없이 추가 가능하다.

구현 단계에서는 `scoreHand(tiles, dora, relics = [], context = {})`로 시그니처를 확장하고, 내부에서 `evaluateYaku(tiles, analysis, context)`를 호출하도록 바꾼다. 이 연결이 있어야 리치만으로 역 없는 완성형도 화료 역을 충족할 수 있다.

### 9.2 가장 큰 리스크

가장 큰 리스크는 리치 가능 판정이 렌더링마다 반복되면서 불필요하게 무거워지는 것이다. 손패 14장 x 후보패 34종, 최대 476회 판정을 수행할 수 있다.

현재 규모에서는 브라우저에서 감당 가능할 가능성이 높지만, `scoreHand()`가 유물 효과와 모든 역 판정을 포함하므로 버튼 렌더링마다 매번 호출하면 체감 지연이 생길 수 있다. 우선 구현 후 문제가 있으면 다음 중 하나를 적용한다.

- `getRiichiState()` 결과를 현재 손패 서명 기준으로 캐시한다.
- 리치 가능 판정에서는 `scoreHand()` 대신 `analyzeHand()`와 `evaluateYaku()`만 호출한다.
- 모든 후보를 끝까지 탐색하지 않고 첫 유효 후보 발견 시 종료한다.

### 9.3 규칙 해석 리스크

실제 리치마작의 리치는 멘젠 텐파이 상태에서 선언하는 역이지만, 현재 게임에는 부로/멘젠, 쯔모/론, 버림패 강 개념이 없다. 따라서 이 기능은 "정통 리치"라기보다 "리치마작의 리치 감각을 교체 게임에 맞게 변환한 특수 액션"으로 정의해야 한다.

문서와 UI에서도 "리치 선언"이라는 이름은 쓰되, 동작 설명은 현재 게임 규칙 기준으로 명확히 보여주는 것이 좋다.

### 9.4 밸런스 검토

리치 보상은 `리치 1판 + 역 배수 +0.75`부터 시작하는 것을 추천한다.

이 값은 손패 고정과 자동 실패 리스크를 보상하기에 충분하고, 전설 유물의 전체 배수 보너스처럼 게임을 즉시 깨뜨릴 정도로 크지는 않다. 추가로 남은 교체 횟수 보상은 `+0.1`씩만 더해 리치 성공 타이밍에 의미를 주되, 최대 `+1.5`를 넘지 않게 제한한다.

### 9.5 추천 범위

1차 구현에서는 다음 범위로 제한한다.

- 리치 가능 판정
- 리치 선언 버튼
- 자동 1장 교체 해결
- 리치 1판 추가
- 리치 전용 역 배수 보너스
- 체크 스크립트 테스트

일발, 더블리치, 멘젠쯔모, 우라도라 같은 추가 요소는 현재 게임 상태 모델에 없는 정보가 필요하므로 이번 범위에서 제외한다.

---

## 10. 성공 기준

- [ ] 리치 가능한 손패에서만 버튼이 활성화된다.
- [ ] 리치 선언 후 일반 패 선택과 일반 교체가 막힌다.
- [ ] 리치 선언 후 지정된 1장만 자동 교체된다.
- [ ] 자동 교체 중 화료하면 리치 역과 보상 배율이 적용된다.
- [ ] 자동 교체가 모두 실패하면 라운드 실패로 처리된다.
- [ ] 튜토리얼 흐름이 기존처럼 동작한다.
- [ ] `npm run check`와 `npm run build`가 통과한다.

---

## 11. 개정 계획: 리치 진행감과 수동 제출

### 11.1 변경 목표

현재 구현은 리치 선언 즉시 내부 루프에서 남은 교체 횟수를 모두 소모하고, 성공하면 곧바로 다음 라운드 보상 흐름으로 넘어간다. 기능적으로는 맞지만 플레이어가 "패가 한 장씩 들어오고 있다"는 감각을 느끼기 어렵다.

이번 개정의 목표는 다음 두 가지다.

| 목표 | 설명 |
|------|------|
| 리치 진행감 강화 | 자동 교체는 유지하되, 교체 대상 패가 빠지고 새 패가 들어오는 과정을 화면 상태와 애니메이션으로 보여준다. |
| 성공 후 수동 제출 | 리치 성공 시 즉시 라운드 통과 처리하지 않고, 완성된 손패와 리치 점수를 보여준 뒤 유저가 `조합 제출`을 눌러 다음 라운드로 이동한다. |

### 11.2 상태 모델 개정

`riichi` 상태에 진행 단계와 최근 교체 정보를 추가한다.

```js
riichi: {
  active: false,
  phase: "idle" | "declared" | "drawing" | "ready" | "failed",
  exchangeTileId: null,
  waits: [],
  attemptsUsed: 0,
  lastDiscardedTile: null,
  lastDrawnTile: null,
}
```

| phase | 의미 |
|-------|------|
| `idle` | 리치 전 |
| `declared` | 리치 선언 직후, 자동 교체 시작 전 |
| `drawing` | 한 장 교체 연출 중 |
| `ready` | 리치 성공, 화료 가능한 손패를 유지한 상태 |
| `failed` | 남은 교체 횟수 안에 화료하지 못함 |

`status`는 기본적으로 `playing`을 유지한다. 리치 성공 후에도 `status: "playing"`으로 남겨야 `조합 제출` 버튼을 누를 수 있다.

### 11.3 액션 흐름 개정

현재 `declareRiichi()`가 즉시 `resolveRiichi()`를 호출해 끝까지 처리하는 구조를 다음처럼 나눈다.

```text
declareRiichi()
  -> riichi.active = true
  -> riichi.phase = "declared"
  -> 교체 대상과 대기패 저장
  -> 즉시 라운드 판정은 하지 않음

advanceRiichi()
  -> 지정된 1장 교체
  -> lastDiscardedTile / lastDrawnTile 저장
  -> 화료 확인
  -> 성공 시 phase = "ready"
  -> 실패했고 횟수 남음: 다음 advanceRiichi 예약
  -> 실패했고 횟수 없음: status = "lost"

submitHand()
  -> riichi.phase === "ready"이면 리치 컨텍스트로 점수 계산
  -> 기존 라운드 통과/보상/승리 흐름 실행
```

자동 진행은 게임 로직 안에서 `while`로 한 번에 끝내지 않는다. 대신 UI 이벤트 쪽에서 타이머를 이용해 `advanceRiichi()`를 여러 번 호출한다.

### 11.4 UI 진행 연출

최소 구현은 CSS 클래스와 메시지 변화만으로도 충분하다.

1. 리치 선언 직후
   - 메시지: `리치 선언. 대기패: ...`
   - 손패 영역에 `is-riichi` 클래스 추가
   - 리치 버튼 비활성화

2. 교체 1회 진행
   - 교체 대상 패에 `tile-riichi-discarding` 클래스 적용
   - 새로 들어온 패에 `tile-riichi-drawn` 클래스 적용
   - 메시지: `리치 진행 중... 2회째 교체`

3. 실패 후 다음 교체 대기
   - 350~600ms 정도의 짧은 간격 후 다음 `advanceRiichi()` 호출
   - 너무 긴 연출은 반복 플레이에서 답답하므로 0.5초 안팎을 권장

4. 성공
   - 메시지: `리치 성공! 조합 제출을 눌러 점수를 확정하세요.`
   - `조합 제출` 버튼 활성화
   - 일반 교체와 패 선택은 계속 비활성화
   - 점수 패널은 리치 컨텍스트를 적용한 예상 점수를 보여준다.

5. 실패
   - 기존처럼 `status: "lost"` 처리
   - 메시지: `리치 실패. 남은 교체 횟수 안에 대기패를 가져오지 못했습니다.`

### 11.5 이벤트 설계

`src/ui/events.js`에서 리치 자동 진행 예약을 담당한다.

```js
case "declare-riichi":
  setState(declareRiichi(getState()));
  rerender();
  scheduleRiichiAdvance();
  break;
```

권장 구조:

```js
function scheduleRiichiAdvance() {
  window.setTimeout(() => {
    const state = getState();
    if (state.riichi?.phase !== "declared" && state.riichi?.phase !== "drawing") return;
    setState(advanceRiichi(state));
    rerender();
    if (getState().riichi?.phase === "drawing") scheduleRiichiAdvance();
  }, 450);
}
```

타이머는 UI 계층에서 관리하는 것이 좋다. `game.js`는 순수하게 "한 번 진행하면 다음 상태가 무엇인가"만 반환해야 테스트하기 쉽다.

### 11.6 제출 버튼 규칙

리치 상태에서는 `조합 제출` 버튼 조건을 다음처럼 바꾼다.

| 상태 | 제출 버튼 |
|------|-----------|
| 리치 전 | 기존과 동일 |
| `declared` / `drawing` | 비활성화 |
| `ready` | 활성화 |
| `failed` | 비활성화 |

`submitHand()`는 `riichi.active`만 보고 막으면 안 된다. 리치 성공 상태인 `riichi.phase === "ready"`에서는 제출을 허용해야 한다.

### 11.7 점수 표시 규칙

리치 선언 후 점수 패널은 다음처럼 컨텍스트를 나눠 계산한다.

- `phase: "declared"` 또는 `"drawing"`: 현재 손패 기준 예상 점수. 아직 미완성이면 미완성으로 표시.
- `phase: "ready"`: `scoreHand(..., { riichi: true })`로 리치 역과 보너스를 포함한 확정 전 점수 표시.
- 제출 시에도 같은 컨텍스트로 계산해 UI에 보이는 점수와 실제 라운드 처리 점수가 어긋나지 않게 한다.

### 11.8 구현 순서

1. `riichi.phase`, `lastDiscardedTile`, `lastDrawnTile`을 상태에 추가한다.
2. `declareRiichi()`에서 즉시 `resolveRiichi()`를 호출하지 않고 `phase: "declared"` 상태만 만든다.
3. 기존 `resolveRiichi()`를 `advanceRiichi()`로 바꾸고, 한 번 호출할 때 한 장만 교체하도록 수정한다.
4. `submitHand()`가 `riichi.phase === "ready"` 상태를 허용하도록 수정한다.
5. `src/ui/events.js`에 리치 진행 타이머를 추가한다.
6. `renderGameView()`와 `renderTable()`에서 리치 단계별 버튼 활성 조건과 메시지를 맞춘다.
7. `tileButton()` 또는 손패 렌더링에서 최근 버린 패/뽑은 패에 CSS 클래스를 붙인다.
8. `styles.css`에 리치 교체 연출 클래스를 추가한다.
9. 체크 스크립트에 다음 테스트를 추가한다.
   - 리치 선언 직후 라운드가 끝나지 않는다.
   - `advanceRiichi()` 1회당 교체 횟수가 1만 줄어든다.
   - 리치 성공 후 `status`는 `playing`, `riichi.phase`는 `ready`다.
   - `submitHand()`를 호출해야 보상/다음 라운드 흐름으로 넘어간다.

### 11.9 검토 의견

이 개정은 리치의 재미를 살리는 방향으로 타당하다. 기존 즉시 해결 방식은 구현은 단순하지만, 플레이어가 선택 이후 결과만 받게 되어 슬롯처럼 느껴질 수 있다. 반면 한 장씩 교체되는 상태를 렌더링하면 자동 진행이어도 "지금 패가 들어오고 있다"는 감각이 생긴다.

가장 중요한 주의점은 게임 로직과 타이머를 분리하는 것이다. `game.js`에서 비동기 타이머를 직접 다루면 테스트가 어려워지고 상태 추적이 복잡해진다. `game.js`는 `advanceRiichi(state)`처럼 순수 함수에 가깝게 두고, `events.js`에서 450ms 간격으로 호출하는 구조가 가장 안전하다.

리치 성공 후 수동 제출도 좋은 변경이다. 점수 패널을 확인하고 직접 `조합 제출`을 누르게 하면, 성공의 여운과 점수 확인 시간이 생긴다. 이때 `조합 제출` 버튼만 활성화하고 일반 교체는 계속 막아야 리치의 "손패 고정" 리스크가 유지된다.
