# 런 저장, 리포트, 점수 설명, 상점 2차 확장 구현 계획

**Status**: Draft  
**Created**: 2026-05-26  
**Feature**: run-persistence-reporting  
**Phase**: Plan

---

## 목표

현재 게임은 리치, 깡/도라/린샹, 상점, 유물, 증강, 확장 역 판정까지 들어간 플레이 가능한 상태다. 다음 구현은 새 규칙을 더 얹기보다, 반복 플레이와 밸런싱에 필요한 기반을 만드는 것을 목표로 한다.

1. 런 저장/재개와 전적을 추가해 플레이 중단 비용을 줄인다.
2. 시드와 런 리포트를 추가해 밸런스 조정과 버그 재현을 쉽게 만든다.
3. 점수 상세 설명을 개선해 플레이어가 빌드 결과를 이해할 수 있게 한다.
4. 상점 2차 확장을 추가해 라운드 사이 선택지를 늘린다.

권장 구현 순서는 다음과 같다.

```text
런 저장/재개
-> 전적/런 리포트
-> 점수 설명 UX
-> 상점 2차 확장
```

---

## 현재 구조 요약

### 상태 진입점

- `src/app.js`
  - `let state = newTitle()`로 게임 상태를 메모리에만 보관한다.
  - `setState()`는 단순 대입만 수행한다.
  - 현재 `localStorage` 저장/복원 흐름은 없다.

### 게임 상태

- `src/game.js`
  - `newRun()`, `newTitle()`, `newTutorial()`이 초기 상태를 만든다.
  - `finishScoredHand()`가 라운드 성공, 실패, 상점 진입, 완주를 처리한다.
  - `shop`, `coins`, `playerTiles`, `relics`, `augments`, `riichi`, `kan`, `doraState`, `deadWall`이 런 핵심 상태다.

### UI

- `src/ui/render/game.js`
  - 현재 점수, 목표, 코인, 도라, 손패, 보유 유물/증강을 렌더링한다.
  - 점수 계산은 `renderGameView()`에서 즉시 수행한다.
- `src/ui/render/score.js`
  - 점수 구성 요소를 목록으로 보여준다.
  - 계산식의 단계별 적용 결과와 라운드/런 누적 리포트는 없다.
- `src/ui/render/shop.js`
  - 유물/증강 구매, 패 강화/추가/삭제를 처리한다.
  - reroll, 상품 잠금, 할인, 희귀 패 추가, 강화 종류 확장은 없다.

### 검증

- `npm run check`
  - 문법 검사, 유물/증강 데이터 검사, 역 판정 검사, 패산 검사까지 포함한다.
- `npm run build`
  - Vite 프로덕션 빌드를 검증한다.

---

## 1차 범위

1차 구현은 다음으로 제한한다.

- 자동 저장
- 타이틀 화면에서 이어하기
- 런 완료/실패 시 전적 기록
- 시드 기반 랜덤 생성 기반 추가
- 런 리포트 데이터 구조 추가
- 점수 상세 패널 추가
- 상점 reroll과 상품 잠금 추가

다음 항목은 2차 이후로 미룬다.

- 클라우드 저장
- 여러 저장 슬롯
- 리플레이 재생
- 일일 시드 챌린지
- 업적 시스템
- 대규모 밸런스 자동 분석 도구
- 상점 전용 신규 희귀도 체계

---

## 1. 런 저장/재개

### 목표

브라우저를 새로고침하거나 닫아도 현재 런을 이어갈 수 있게 한다. 튜토리얼과 타이틀 상태는 저장 대상에서 제외하고, 본 게임 런만 저장한다.

### 저장 대상

저장 대상은 `state.mode === "main"`인 상태 중 다음 상태다.

- `startReward`
- `playing`
- `shop`
- `lost`
- `won`

`title`, `tutorial`, `tutorialComplete`는 자동 저장하지 않는다.

### 저장 키

```js
const SAVE_VERSION = 1;
const RUN_SAVE_KEY = "riichi-rogue:run:v1";
const STATS_SAVE_KEY = "riichi-rogue:stats:v1";
```

저장 데이터는 버전을 포함한다.

```js
{
  version: 1,
  savedAt: "2026-05-26T12:00:00.000Z",
  state: { ... }
}
```

### 신규 모듈

```text
src/
  game/
    save.js
```

역할:

- `loadRunSave()`
- `saveRunState(state)`
- `clearRunSave()`
- `canResumeRun(saved)`
- `sanitizeStateForSave(state)`
- `restoreSavedState(saved)`

### 저장 정책

`src/app.js`의 `setState()`를 저장 훅으로 확장한다.

```js
function setGameState(nextState) {
  state = nextState;
  saveRunState(state);
}
```

저장 제외 조건:

- `state.mode !== "main"`
- `state.status === "title"`
- `state.status === "tutorial"`
- `state.status === "tutorialComplete"`

런이 `lost` 또는 `won`이 되면 저장은 유지하되, 전적 기록 후 타이틀로 돌아가거나 새 게임을 시작할 때 삭제한다.

### 타이틀 UI

`src/ui/render/title.js`에 이어하기 버튼을 추가한다.

표시 조건:

- 유효한 저장 데이터가 있다.
- 저장 데이터의 `state.mode === "main"`이다.
- 저장 데이터의 `state.status`가 `won`이 아니거나 `lost`여도 결과 확인 화면을 복원할 수 있다.

버튼:

```html
<button class="mode-card" data-action="resume-run">이어하기</button>
```

### 이벤트

`src/ui/events.js`에 액션을 추가한다.

- `resume-run`: 저장된 상태를 복원한다.
- `clear-save`: 저장 상태를 삭제한다.

### 위험 지점

- `copyId`가 저장/복원 후에도 그대로 유지되어야 한다.
- 저장된 `deck`, `deadWall`, `doraState`, `playerTiles`의 물리 패 중복이 없어야 한다.
- 함수, Map, Set은 상태에 저장하지 않는다. 현재 상태는 대부분 plain object/array이므로 localStorage에 적합하다.
- 향후 상태 구조가 바뀌면 `SAVE_VERSION` 마이그레이션이 필요하다.

### 검증

체크 스크립트 추가 후보:

```text
scripts/check-save.mjs
```

검증 항목:

- `newRun()` 상태를 JSON 직렬화/역직렬화할 수 있다.
- 저장 후 복원한 상태가 필수 필드를 유지한다.
- `deck`, `hand`, `deadWall.rinshanTiles`, `doraState.indicators`, `doraState.uraIndicators` 간 `copyId` 중복이 없다.
- 잘못된 version은 복원하지 않는다.
- 필수 필드가 빠진 저장 데이터는 무시한다.

---

## 2. 전적과 런 리포트

### 목표

완주/실패 결과를 기록하고, 라운드별 점수와 빌드 선택을 남겨 밸런스 조정에 활용할 수 있게 한다.

### 상태 추가

런 상태에 메타데이터를 추가한다.

```js
run: {
  id: "run-...",
  seed: "....",
  startedAt: "2026-05-26T12:00:00.000Z",
  roundReports: [],
}
```

`newRun()`에서 생성한다.

튜토리얼과 타이틀에는 `run: null`을 둔다.

### 라운드 리포트

라운드 성공 또는 실패 시 다음 데이터를 추가한다.

```js
{
  roundIndex: 0,
  roundName: "동 1국",
  targetScore: 80,
  totalScore: 132,
  status: "cleared",
  hand: [],
  scoringTiles: [],
  yaku: [],
  doraCount: 2,
  regularDoraCount: 2,
  uraDoraCount: 0,
  relics: [],
  augments: [],
  coinsBefore: 0,
  coinsEarned: 6,
  coinsAfter: 6,
  discardsLeft: 4,
  riichi: null,
  kanCount: 0,
}
```

주의:

- 전체 상태를 중복 저장하지 않는다.
- 리포트는 UI 표시와 밸런싱에 필요한 요약만 저장한다.
- 손패는 `suit`, `value`, `enhancement` 정도만 저장하고 `copyId`는 리포트에는 선택적으로 둔다.

### 전적 저장

`STATS_SAVE_KEY`에 누적 기록을 저장한다.

```js
{
  version: 1,
  totalRuns: 12,
  wins: 3,
  losses: 9,
  bestScore: 422,
  bestRound: 4,
  recentRuns: []
}
```

`recentRuns`는 최근 10~20개로 제한한다.

### 결과 화면

`src/ui/render/modal.js`의 `renderEnd()`를 확장하거나 별도 `renderRunReport()`를 추가한다.

표시 항목:

- 결과: 완주/실패
- 도달 라운드
- 최종 점수 또는 마지막 라운드 점수
- 보유 유물/증강
- 라운드별 점수 목록
- 최고 점수 갱신 여부

### 타이틀 화면 전적

`src/ui/render/title.js`에 간단한 전적 요약을 추가한다.

- 총 런 수
- 완주 수
- 최고 점수
- 최고 도달 라운드

### 검증

`scripts/check-save.mjs` 또는 별도 `scripts/check-report.mjs`에 추가한다.

- 라운드 성공 시 `roundReports.length`가 증가한다.
- 실패 시 실패 리포트가 기록된다.
- 완주/실패 시 stats가 1회만 증가한다.
- 최근 런 목록이 상한을 넘지 않는다.
- 저장 데이터가 JSON 직렬화 가능하다.

---

## 3. 시드 기반 랜덤

### 목표

같은 시드에서 같은 시작 보상, 패산, 상점 구성이 나오게 한다. 밸런싱과 버그 재현을 쉽게 하기 위한 기반 기능이다.

### 신규 모듈

```text
src/
  game/
    rng.js
```

API:

```js
export function createSeededRng(seed) {}
export function createRandomSeed() {}
export function randomId(rng, prefix) {}
export function shuffleWithRng(items, rng) {}
export function takeWeightedItemWithRng(candidates, getWeight, rng) {}
```

### 상태 추가

```js
rng: {
  seed: "ABCD-1234",
  calls: 0,
}
```

또는 상태에 RNG 객체를 저장하지 않고, 순수하게 `seed + calls`로 다음 랜덤값을 계산한다. localStorage 저장과 재현성을 고려하면 RNG 객체를 상태에 저장하지 않는 방식이 안전하다.

권장:

```js
rng: {
  seed: "ABCD-1234",
  cursor: 0,
}
```

랜덤을 쓸 때마다 다음 형태로 상태와 값을 함께 반환한다.

```js
const { value, rng } = nextRandom(state.rng);
return { ...state, rng };
```

다만 현재 코드의 랜덤 사용 지점이 많으므로 1차에서는 현실적으로 다음 절충안을 사용한다.

- `newRun(seed)`에서 런 생성 시 `rng`를 만든다.
- 라운드/상점 생성 함수 안에서 동일 rng 인스턴스를 전달한다.
- 저장 상태에는 `seed`와 주요 결과물을 이미 저장하므로, 진행 중 저장 복원은 결과물 복원에 의존한다.
- 완전한 중간 재현성은 2차에서 `rng.cursor` 방식으로 개선한다.

### 변경 대상

- `shuffle(items)`
- `drawWeightedItems(candidates, count)`
- `takeWeightedItem(candidates)`
- `crypto.randomUUID()`로 만든 `copyId`

1차에서는 `copyId`까지 완전 재현할 필요는 낮다. 다만 같은 시드에서 비교 가능한 리포트를 만들려면 패산과 보상 결과는 재현되어야 한다.

### 타이틀 UI

2차에서 시드 입력을 추가한다. 1차에서는 새 게임 시작 시 자동 시드를 생성하고 결과 화면에 표시한다.

### 검증

- 같은 seed로 `newRun(seed)`를 두 번 만들면 시작 보상 id 목록이 같다.
- 같은 seed로 첫 라운드 hand/dora/deadWall 구성이 같다.
- 서로 다른 seed는 높은 확률로 다른 구성을 만든다.

---

## 4. 점수 상세 설명 UX

### 목표

플레이어가 최종 점수가 어떻게 만들어졌는지 이해할 수 있게 한다. 현재 점수 목록은 구성 요소를 보여주지만, 계산 순서와 중간 결과가 명확하지 않다.

### `scoreHand()` 반환 확장

현재 반환값에 이미 주요 계산 결과가 포함되어 있다.

- `tileScore`
- `tileScoreBonus`
- `tileMultiplier`
- `tileScoreTotal`
- `yakuScore`
- `yakuScoreBonus`
- `yakuMultiplier`
- `yakuScoreTotal`
- `globalMultiplier`
- `totalScore`

추가할 수 있는 요약 필드:

```js
scoreBreakdown: {
  tile: {
    base,
    bonus,
    multiplier,
    total,
  },
  yaku: {
    base,
    dora,
    bonus,
    multiplier,
    completionMultiplier,
    riichiMultiplierBonus,
    total,
  },
  global: {
    multiplier,
    total,
  }
}
```

중복 계산을 피하기 위해 기존 필드를 그대로 조립해 반환한다.

### UI 변경

`src/ui/render/score.js`에 상세 패널을 추가한다.

권장 형태:

- 기본 목록은 유지한다.
- "계산 상세" 토글 버튼을 추가한다.
- 펼쳤을 때 다음 순서를 보여준다.

```text
패 점수: (기본 + 보너스) x 패 배율 = ...
역 점수: (역 + 도라 + 보너스) x 역 배율 = ...
완성 배율: x...
전체 배율: x...
최종 점수: ...
```

### UI 상태

`src/ui/ui-state.js`에 추가한다.

```js
let isScoreDetailOpen = false;
```

이벤트:

```html
<button data-action="toggle-score-detail">계산 상세</button>
```

### 점수 항목 설명

각 항목에는 기존 `renderTermText()`를 사용한다.

추가 용어 후보:

- 패 점수
- 역 점수
- 완성 배율
- 전체 배율
- 뒷도라
- 증강 보너스

`src/data/term-reference.js`에 없는 용어는 추가한다.

### 검증

- 상세 패널을 닫아도 기존 점수 UI가 유지된다.
- 상세 패널을 열면 `score.totalScore`와 같은 최종 점수를 표시한다.
- 리치 성공, 깡/린샹, 증강, 유물 보너스가 있는 케이스에서 각 보너스가 누락되지 않는다.

---

## 5. 상점 2차 확장

### 목표

라운드 사이 선택지를 늘린다. 1차에서는 reroll과 상품 잠금만 추가한다. 할인, 희귀 패 추가, 강화 종류 확장은 그 다음 단계로 둔다.

### 5.1 Reroll

상점 상품을 코인을 내고 다시 뽑는다.

상태 추가:

```js
shop: {
  rerollCount: 0,
  rerollPrice: 2,
  lockedOfferIds: [],
  ...
}
```

액션:

```js
export function rerollShop(state) {}
```

규칙:

- `state.status === "shop"`에서만 가능하다.
- 코인이 `shop.rerollPrice` 이상이어야 한다.
- sold 상품은 유지하지 않는다.
- locked 상품은 유지한다.
- 나머지 상품만 새로 생성한다.
- reroll 후 가격은 1씩 증가한다.

가격 초안:

```js
base: 2
increasePerUse: 1
max: 6
```

### 5.2 상품 잠금

관심 상품을 reroll에서 제외한다.

액션:

```js
export function toggleShopOfferLock(state, offerId) {}
```

규칙:

- sold 상품은 잠글 수 없다.
- 잠금 자체는 무료로 둔다.
- 잠긴 상품은 reroll 시 유지된다.
- 다음 상점으로 넘어가면 잠금 상태는 사라진다.

UI:

```html
<button data-action="toggle-shop-lock" data-shop-offer-id="...">잠금</button>
```

### 5.3 할인

2차 후반 또는 3차로 미룬다.

가능한 방향:

- 유물 효과로 특정 카테고리 할인
- reroll 가격 할인
- 첫 구매 할인
- sold 상품 환급 없음

### 5.4 강화 종류 확장

현재 강화는 `TILE_UPGRADES`에 고정되어 있다.

확장 후보:

- 기본 점수 증가
- 도라일 때 추가 점수
- 특정 역에 포함되면 역 점수 증가
- 같은 얼굴이 3장 이상이면 배율 증가

1차 상점 확장에서는 데이터 구조만 열어두고, 새 강화 효과는 별도 계획으로 분리한다.

### 검증

- reroll 시 코인이 차감된다.
- reroll 시 잠기지 않은 상품만 교체된다.
- 잠긴 상품은 reroll 후에도 id와 내용이 유지된다.
- sold 상품은 잠금/구매가 다시 불가능하다.
- reroll 가격이 증가한다.
- 코인이 부족하면 reroll되지 않는다.

---

## 구현 순서

### 단계 1: 저장 모듈

1. `src/game/save.js` 추가
2. 저장 데이터 version 정의
3. `saveRunState()`, `loadRunSave()`, `clearRunSave()` 구현
4. `src/app.js`의 `setState()`를 저장 훅으로 변경
5. 타이틀에서 저장 유무를 읽어 이어하기 버튼 표시
6. `resume-run`, `clear-save` 이벤트 추가
7. `scripts/check-save.mjs` 추가
8. `npm run check`, `npm run build` 실행

### 단계 2: 전적/런 리포트

1. `newRun()`에 `run` 메타데이터 추가
2. 라운드 결과 리포트 생성 함수 추가
3. `finishScoredHand()` 성공/실패 분기에 리포트 기록
4. 완주/실패 시 stats 저장
5. 결과 모달에 런 요약 추가
6. 타이틀에 전적 요약 추가
7. 저장/리포트 검증 케이스 추가
8. `npm run check`, `npm run build` 실행

### 단계 3: 시드 기반 랜덤

1. `src/game/rng.js` 추가
2. `newRun(seed)` 형태로 시드 주입 가능하게 변경
3. `shuffle()`과 보상 추첨을 seed 기반으로 교체
4. 결과 화면에 seed 표시
5. 같은 seed 재현성 검증 추가
6. `npm run check`, `npm run build` 실행

### 단계 4: 점수 설명 UX

1. `scoreHand()`에 `scoreBreakdown` 조립 추가
2. `src/ui/ui-state.js`에 `isScoreDetailOpen` 추가
3. `renderScore(score, uiState)` 형태로 점수 상세 토글 지원
4. `toggle-score-detail` 이벤트 추가
5. 필요한 용어 설명 추가
6. 리치/도라/증강/유물 케이스에서 UI 검증
7. `npm run check`, `npm run build` 실행

### 단계 5: 상점 reroll/잠금

1. `shop` 상태에 `rerollCount`, `rerollPrice`, `lockedOfferIds` 추가
2. `toggleShopOfferLock()` 구현
3. `rerollShop()` 구현
4. `renderShop()`에 잠금 버튼과 reroll 버튼 추가
5. `events.js`에 액션 연결
6. reroll/잠금 검증 케이스 추가
7. `npm run check`, `npm run build` 실행

---

## 성공 기준

- 새로고침 후 현재 본 게임 런을 이어할 수 있다.
- 튜토리얼 상태는 저장되지 않는다.
- 완주/실패 후 전적이 누적된다.
- 결과 화면에서 라운드별 점수와 빌드 요약을 볼 수 있다.
- 런 seed가 기록된다.
- 같은 seed로 시작한 런의 초기 보상과 첫 라운드 구성이 재현된다.
- 점수 상세 패널에서 최종 점수 계산 과정을 설명한다.
- 상점에서 reroll과 상품 잠금을 사용할 수 있다.
- `npm run check`와 `npm run build`가 통과한다.

---

## 리스크와 대응

### 저장 데이터 호환성

상태 구조가 자주 바뀌면 저장 데이터가 깨질 수 있다. `SAVE_VERSION`을 필수로 두고, version이 맞지 않으면 저장을 무시한다. 마이그레이션은 저장 안정화 후 추가한다.

### 랜덤 재현성

현재 `Math.random()`과 `crypto.randomUUID()`가 여러 곳에서 사용된다. 완전한 중간 진행 재현성은 한 번에 구현하지 않고, 1차에서는 시작 보상과 라운드 구성 재현을 목표로 한다.

### 런 리포트 비대화

전체 상태를 매 라운드 저장하면 localStorage가 커진다. 리포트에는 표시와 분석에 필요한 요약만 저장한다.

### UI 복잡도

점수 상세와 상점 확장은 화면 밀도를 높인다. 기본 화면은 유지하고, 상세 정보는 토글/접힘 형태로 제공한다.

### 상점 reroll 밸런스

reroll이 너무 싸면 원하는 빌드를 쉽게 찾을 수 있다. 기본 2코인, 사용마다 +1, 최대 6코인으로 시작하고 런 리포트를 보고 조정한다.

---

## 후속 개선

- 저장 슬롯 3개
- 일일 시드 챌린지
- 런 히스토리 상세 보기
- 리포트 JSON 내보내기
- 상점 할인 유물
- 상점 상품 잠금 관련 유물
- 새 강화 타입 데이터화
- 점수 변화 미리보기
- 키보드 조작과 단축키
