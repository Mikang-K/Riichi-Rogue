# Plan: 깡, 영상패, 도라/뒷도라 확장

**Feature**: kan-dora-rinshan  
**Goal**: 현재 단일 도라와 일반 패산 기반 교환 흐름을 확장해, 리치마작처럼 영상패을 별도 관리하고 깡 선언 시 도라를 추가 공개하며, 리치 화료 시 뒷도라를 점수에 포함한다. 깡 후 영상패로 화료하면 `영상개화` 역을 추가한다.

## 1. 현재 구조 요약

현재 라운드 상태는 `src/game.js`에서 생성되고, 패산은 `deck`, 도라는 `dora` 단일 값으로 관리된다.

- `newRun()`, `startRound()`: `buildDeck()` 후 `draw(deck, 1)[0]`을 도라로 빼고, 14장을 손패로 지급한다.
- `exchangeSelected()`: 선택한 패 수만큼 `deck`에서 보충한다.
- `declareRiichi()` / `advanceRiichi()`: 리치 상태에서 지정 패 1장을 `deck`에서 반복 교체한다.
- `scoreHand(tiles, dora, relics, context)`: 손패와 단일 도라를 비교해 도라 점수를 계산한다.
- `evaluateYaku(tiles, analysis, context)`: `context.riichi`처럼 상태 기반 역을 받을 수 있는 통로가 이미 있다.

따라서 핵심 변경은 `dora` 단일 값을 `doraState` 또는 복수 도라 배열로 일반화하고, 패산에서 영상패/도라표시패/뒷도라표시패를 라운드 시작 시 분리하는 것이다.

## 2. 규칙 범위

1차 구현 범위는 이 프로젝트의 교환형 로그라이트 흐름에 맞춘 간소화 규칙으로 둔다.

- 라운드 시작 시 패산에서 영상패 4장과 도라표시패/뒷도라표시패 후보를 별도 영역으로 분리한다.
- 기본 공개 도라는 1개다.
- 깡 선언 1회마다 공개 도라 수를 1개 늘린다.
- 뒷도라는 리치 상태로 화료를 확정할 때만 공개 도라 수와 같은 개수만큼 적용한다.
- 깡 선언 후 영상패을 1장 가져오고, 그 패가 포함된 손패로 화료하면 `영상개화` 역을 붙인다.
- 1차에서는 암깡만 지원한다. 현재 게임에는 상대 버림패/후로/론이 없으므로 명깡, 가깡, 창깡은 제외한다.

## 3. 상태 모델

`state.dora`를 바로 배열로 바꾸면 영향 범위가 크므로, 점진 전환을 위해 새 상태 묶음을 추천한다.

```js
doraState: {
  indicators: [],       // 도라표시패 후보, 최대 5장
  uraIndicators: [],    // 뒷도라표시패 후보, 최대 5장
  revealedCount: 1,
}
deadWall: {
  rinshanTiles: [],     // 영상패 4장
  drawsUsed: 0,
}
kan: {
  declaredCount: 0,
  lastRinshanTileId: null,
  rinshanReady: false,
}
```

호환성을 위해 초반 구현에서는 `state.dora`를 `getVisibleDoraIndicators(state)[0]`처럼 유지하거나, 렌더러/테스트를 한 번에 정리할 수 있으면 `state.dora`를 제거하고 `state.doraState`만 사용한다.

## 4. 패산 구성

새 헬퍼를 만든다.

```js
function setupWall() {
  const deck = shuffle(buildDeck());
  const doraIndicators = draw(deck, 5);
  const uraIndicators = draw(deck, 5);
  const rinshanTiles = draw(deck, 4);
  return {
    liveWall: deck,
    doraState: { indicators: doraIndicators, uraIndicators, revealedCount: 1 },
    deadWall: { rinshanTiles, drawsUsed: 0 },
  };
}
```

이 프로젝트에서는 현재 `deck`이 일반 교환/리치 자동 교체용 라이브 패산이다. 영상패은 `deck`에서 다시 뽑지 않고 `deadWall.rinshanTiles`에서만 소비한다.

주의할 점:

- 실제 리치마작의 도라는 "도라표시패 다음 패"지만 현재 게임은 표시패 자체를 도라처럼 취급하고 있다. 기능명은 "도라 표시패"로 바꾸더라도 1차 구현은 기존 밸런스를 유지하기 위해 같은 패 매칭으로 둘지, 실제 다음 패로 계산할지 결정해야 한다.
- 실제 다음 패 규칙을 적용하려면 `nextDoraFace(indicator)`를 `tile-utils.js`에 추가한다.

## 5. 점수 계산 변경

`scoreHand(tiles, dora, relics, context)`를 복수 도라 기준으로 확장한다.

추천 시그니처:

```js
scoreHand(tiles, doraInput, relics = [], context = {})
```

`doraInput`은 기존 단일 도라도 받고 새 구조도 받게 만든다.

- 기존: `{ suit, value, copyId }`
- 신규: `{ indicators, uraIndicators, revealedCount }`
- 내부에서 `getScoringDoraFaces(doraInput, context)`로 정규화한다.

계산 규칙:

- 일반 도라: `indicators.slice(0, revealedCount)`
- 뒷도라: `context.riichi === true && context.includeUraDora === true`일 때 `uraIndicators.slice(0, revealedCount)`
- `doraCount`: 모든 적용 도라 얼굴과 손패를 비교한 총합
- 같은 얼굴이 일반 도라와 뒷도라에 중복되면 중복 판수로 센다.

`dora-bell`, `dora-mirror` 유물은 `doraCount`/`doraHan`을 그대로 사용하므로, 이 경로만 정리되면 자연스럽게 복수 도라에 대응한다.

## 6. 깡 가능 판정

현재 손패는 14장 고정 교환 게임이라, 4장이 같은 얼굴인 패가 있으면 암깡 후보로 본다.

새 헬퍼:

```js
export function getAvailableKans(state) {
  if (!canAct(state)) return [];
  if (state.riichi?.active && state.riichi.phase !== "ready") return [];
  if (state.deadWall.rinshanTiles.length === 0) return [];
  if (state.doraState.revealedCount >= state.doraState.indicators.length) return [];
  return facesWithCountAtLeast(state.hand, 4);
}
```

리치 중 깡 허용은 신중하게 둔다.

- 1차 추천: 리치 진행 중에는 깡 금지, 리치 성공 후 제출 전에도 깡 금지.
- 이유: 리치 후 암깡은 대기/손패 구성 변화 제약을 검사해야 하며, 현재 리치는 자동 교체 액션으로 구현되어 있어 예외가 많다.
- 후속 확장: 리치 상태에서 같은 4장 암깡이 대기 형태를 바꾸지 않는 경우만 허용.

## 7. 깡 선언 처리

새 액션 `declareKan(state, faceKey)`를 추가한다.

처리 순서:

1. `getAvailableKans(state)`로 후보 검증
2. 해당 4장을 손패에서 제거하거나, 별도 `melds/openSets`가 없으므로 1차에서는 손패에 유지하되 `kan.declaredSets`에 기록
3. 영상패 1장을 `deadWall.rinshanTiles`에서 뽑아 손패에 추가
4. `doraState.revealedCount += 1`
5. `kan.lastRinshanTileId = drawn.copyId`
6. 새 손패가 화료이면 `kan.rinshanReady = true`

손패 표현은 구현 전에 결정이 필요하다.

- 보수적 선택: 손패 14장 모델을 유지하기 위해 4장 중 1장을 "깡으로 고정된 패"로 표시하고, 영상패을 추가한 뒤 플레이어가 1장을 버리거나 교환하도록 한다.
- 간단한 선택: 현재 분석기는 14장 완성형만 받으므로, 깡 4장을 손패에 그대로 두고 영상패까지 더하면 15장이 되어 판정이 깨진다. 따라서 1차 구현에서는 깡 선언 즉시 같은 패 4장 중 1장을 손패 밖 `kan.sets`로 이동해 손패 길이를 14장으로 유지하는 방식이 안전하다.

추천 모델:

```js
kan: {
  declaredCount: 1,
  sets: [{ type: "closedKan", tiles: [/* 4 tiles */] }],
  lastRinshanTileId: "..."
}
```

점수/역 분석에는 `hand` 14장만 넣고, UI에는 `kan.sets`를 별도 표시한다.

## 8. 영상개화 역

`yaku-data.js`에 `rinshanKaiho`를 추가한다.

```js
{
  id: "rinshanKaiho",
  name: "영상개화",
  hanClosed: 1,
  hanOpen: 1,
  score: 10,
  implemented: true,
  text: "깡 선언 후 영상패으로 손패가 완성되면 붙습니다.",
}
```

`yaku-rules.js`의 `tileYakuRules`에 상태 기반 규칙을 추가한다.

```js
["rinshanKaiho", ({ rinshan }) => Boolean(rinshan)]
```

`getScoreContext(state)`는 다음을 포함한다.

```js
{
  riichi: state.riichi?.active && state.riichi.phase === "ready",
  includeUraDora: state.riichi?.active && state.riichi.phase === "ready",
  rinshan: state.kan?.rinshanReady === true,
}
```

제출 후 다음 라운드로 넘어갈 때는 `kan` 상태를 초기화한다.

## 9. UI 변경

`src/ui/render/game.js`

- 상태 그리드의 단일 도라 표시를 `도라` 목록으로 바꾼다.
- 리치 성공 또는 제출 직전 점수 화면에서는 뒷도라도 별도 줄로 표시한다.
- 손패에 4장 같은 패가 있으면 `깡` 버튼 또는 패별 액션을 제공한다.
- 깡 선언 후 `kan.sets` 영역에 깡 묶음을 표시하고, 영상패로 들어온 패에는 짧은 강조 클래스를 적용한다.

`src/ui/render/score.js`

- `도라` 점수 한 줄은 유지하되, 상세로 `도라 n장`, `뒷도라 n장`을 구분할 수 있으면 좋다.
- `영상개화`는 기존 역 목록에 자연스럽게 표시된다.

`src/ui/events.js`

- `data-action="declare-kan"` 분기 추가
- `data-kan-face` 또는 선택된 4장 기준으로 `declareKan()` 호출
- 리치 자동 진행 타이머와 충돌하지 않도록 리치 진행 중 버튼 비활성화

## 10. 테스트 계획

`scripts/check-yaku.mjs`에 다음 케이스를 추가한다.

- 라운드 시작 시 `doraState.indicators.length === 5`, `uraIndicators.length === 5`, `deadWall.rinshanTiles.length === 4`
- 기본 점수는 공개 도라 1개만 센다.
- `revealedCount: 2`일 때 도라 2종이 합산된다.
- 리치 컨텍스트가 없으면 뒷도라가 적용되지 않는다.
- 리치 화료 컨텍스트에서는 공개 도라 수만큼 뒷도라가 적용된다.
- 4장 같은 패가 있을 때 `getAvailableKans()`가 후보를 반환한다.
- 깡 선언 후 `revealedCount`가 1 증가하고 영상패이 1장 소비된다.
- 깡 직후 영상패로 완성된 손패를 제출하면 `영상개화`가 포함된다.
- 영상패가 아닌 일반 교환으로 완성하면 `영상개화`가 붙지 않는다.

## 11. 구현 순서

1. `tile-utils.js`에 도라 얼굴 계산 헬퍼를 추가한다. 기존 밸런스 유지 여부에 따라 `sameFace(indicator)` 또는 `nextDoraFace(indicator)` 방식을 선택한다.
2. `game.js`에 `setupWall()`, `emptyDoraState()`, `emptyDeadWall()`, `emptyKanState()`를 추가하고 `newRun()`, `startRound()`, `newTutorial()`을 새 상태로 전환한다.
3. `scoreHand()`가 단일 도라와 복수 도라 상태를 모두 받을 수 있게 정규화한다.
4. 렌더러가 `state.dora` 대신 공개 도라 배열을 표시하게 바꾼다.
5. `getAvailableKans()`와 `declareKan()`을 추가한다.
6. `yaku-data.js`, `yaku-rules.js`에 `영상개화`를 추가한다.
7. `getScoreContext()`에 `includeUraDora`, `rinshan`을 추가하고 리치 제출 점수에 뒷도라를 반영한다.
8. `events.js`, `render/game.js`, `styles.css`에 깡 버튼/표시/강조를 붙인다.
9. `scripts/check-yaku.mjs`에 회귀 테스트를 추가하고 `npm run check`로 검증한다.

## 12. 리스크와 결정 포인트

- 가장 큰 리스크는 현재 손패 분석기가 14장 기준이라는 점이다. 깡을 손패 안에 4장 그대로 둔 채 영상패을 더하면 분석이 깨지므로, 깡 세트는 손패 밖 상태로 분리해야 한다.
- 도라를 실제 리치마작처럼 "표시패의 다음 패"로 할지, 현재 게임처럼 "표시패와 같은 패"로 유지할지 결정해야 한다. 실제 규칙을 택하면 기존 점수 밸런스와 튜토리얼 기대값이 바뀔 수 있다.
- 리치 중 깡은 1차에서 제외하는 편이 안전하다. 현재 리치는 자동 교체 루프라서 깡 액션을 끼워 넣으면 대기 유지, 뒷도라 수, 제출 가능 상태가 복잡해진다.
- `scoreHand()` 시그니처 변경은 렌더러, 튜토리얼, 테스트에 넓게 닿는다. 단일 도라 입력을 계속 허용하는 호환 계층을 먼저 두면 안전하다.

## 13. 1차 완료 기준

- 도라가 복수 공개될 수 있고 UI에 표시된다.
- 리치 화료 시 뒷도라가 점수에 포함된다.
- 깡 선언 시 영상패을 별도로 소비하고 공개 도라 수가 증가한다.
- 깡 직후 영상패로 화료하면 `영상개화` 역이 표시되고 점수에 반영된다.
- 기존 리치, 일반 교환, 튜토리얼, 유물 도라 보너스가 깨지지 않는다.
