# 증강 점수 성장 구현 계획

## 목표

유물 이외의 성장 요소인 `증강`을 추가한다. 증강은 특정 패, 패 묶음, 역을 직접 강화해 플레이어가 라운드를 진행하며 빌드 방향을 더 세밀하게 만들 수 있도록 한다.

핵심 목표는 다음과 같다.

- 유물과 별개의 보상/보유 요소를 추가한다.
- 특정 역의 점수 또는 배수를 올릴 수 있게 한다.
- 특정 패 또는 패 그룹의 점수 또는 배수를 올릴 수 있게 한다.
- 기존 점수 계산 채널인 패 점수, 역 점수, 패 배수, 역 배수, 전체 배수를 재사용한다.
- 유물 시스템과 중복 구현하지 않고 공통 점수 수정자 구조로 확장한다.

## 현재 구조

현재 점수 계산은 `src/game.js`의 `scoreHand()`에서 처리한다.

```js
scoreHand(tiles, dora, relics = [], context = {})
```

점수는 크게 다음 채널로 나뉜다.

- `tileScore`: 패 기본 점수
- `yakuScore`: 역 점수
- `doraScore`: 도라 점수
- `tileScoreBonus`: 패 점수 보너스
- `yakuScoreBonus`: 역 점수 보너스
- `tileMultiplierBonus`: 패 배수 보너스
- `yakuMultiplierBonus`: 역 배수 보너스
- `globalMultiplierBonus`: 전체 배수 보너스

유물은 `src/data/relics.json`에서 정의하고, `src/game/relic-effects.js`의 핸들러를 통해 점수 보너스를 만든다. `scoreHand()`는 유물 보너스를 합산해 최종 점수에 반영한다.

이 구조는 증강에도 적합하다. 증강은 유물과 UI/보상 정체성은 다르게 가져가되, 점수 계산 내부에서는 유물과 같은 보너스 채널을 사용한다.

## 설계 방향

증강은 다음처럼 정의한다.

```json
{
  "id": "tanyao-focus",
  "name": "탕야오 단련",
  "rarity": "common",
  "target": {
    "type": "yaku",
    "id": "tanyao"
  },
  "effect": {
    "type": "targetYakuScoreBonus",
    "score": 12
  },
  "text": "탕야오가 붙으면 역 점수 +12점"
}
```

JSON에는 순수 데이터만 둔다. 실제 효과 함수는 JS 핸들러에서 조립한다.

## 권장 파일 구조

```text
src/
  data/
    augments.json
  game/
    augment-effects.js
    augments.js
scripts/
  check-augments.mjs
```

역할은 다음과 같다.

- `src/data/augments.json`: 증강 표시 데이터와 효과 파라미터
- `src/game/augment-effects.js`: 증강 효과 타입별 핸들러
- `src/game/augments.js`: JSON 데이터를 런타임 증강 객체로 조립
- `scripts/check-augments.mjs`: 증강 데이터 유효성 검증

## 증강 타겟

초기 구현에서는 세 가지 타겟을 지원한다.

### 1. 특정 역

특정 역이 손패에 붙었을 때 점수나 배수를 올린다.

```json
{
  "target": { "type": "yaku", "id": "chiitoitsu" },
  "effect": { "type": "targetYakuMultiplierBonus", "multiplier": 0.4 }
}
```

예시:

- 탕야오가 붙으면 역 점수 +12점
- 핑후가 붙으면 역 배수 +0.25
- 칠대자가 붙으면 역 점수 +20점
- 청일색이 붙으면 전체 배수 +0.5

### 2. 특정 패

특정 패가 손패에 있을 때 패 점수나 패 배수를 올린다.

```json
{
  "target": { "type": "tileFace", "suit": "m", "value": 5 },
  "effect": { "type": "targetTileScoreBonus", "scorePerTile": 4 }
}
```

예시:

- 5만 1장마다 패 점수 +4점
- 백 1장마다 패 점수 +5점
- 동이 2장 이상이면 패 배수 +0.2

### 3. 패 그룹

조건에 맞는 패 묶음을 강화한다.

```json
{
  "target": { "type": "tileGroup", "group": "honor" },
  "effect": { "type": "tileGroupScoreBonus", "scorePerTile": 3 }
}
```

권장 그룹:

- `honor`: 자패
- `terminal`: 1, 9 수패
- `simple`: 2-8 수패
- `manzu`: 만수
- `pinzu`: 통수
- `souzu`: 삭수
- `dragon`: 삼원패
- `wind`: 풍패

## 효과 타입

초기 효과 타입은 적게 시작한다.

| 효과 타입 | 설명 | 반환 채널 |
| --- | --- | --- |
| `targetYakuScoreBonus` | 특정 역이 있으면 역 점수 증가 | `yakuScoreBonus` |
| `targetYakuMultiplierBonus` | 특정 역이 있으면 역 배수 증가 | `yakuMultiplierBonus` |
| `targetYakuGlobalMultiplierBonus` | 특정 역이 있으면 전체 배수 증가 | `globalMultiplierBonus` |
| `targetTileScoreBonus` | 특정 패 1장마다 패 점수 증가 | `tileScoreBonus` |
| `targetTileThresholdMultiplierBonus` | 특정 패가 일정 수 이상이면 패 배수 증가 | `tileMultiplierBonus` |
| `tileGroupScoreBonus` | 특정 패 그룹 1장마다 패 점수 증가 | `tileScoreBonus` |
| `tileGroupThresholdMultiplierBonus` | 특정 패 그룹이 일정 수 이상이면 패 배수 증가 | `tileMultiplierBonus` |

필요하면 이후 다음 효과를 추가한다.

- 특정 역의 기본 점수 자체를 변경하는 효과
- 특정 패의 기본 점수 자체를 변경하는 효과
- 도라, 리치, 깡 상태와 결합된 증강
- 라운드마다 성장하는 레벨형 증강

## 점수 계산 변경

`scoreHand()`는 기존 호출과 호환되도록 유지한다.

```js
scoreHand(tiles, dora, relics = [], context = {})
```

증강은 `context.augments`로 전달한다.

```js
const score = scoreHand(tiles, doraState, state.relics, {
  ...getScoreContext(state),
  augments: state.augments,
});
```

내부에서는 유물과 증강을 모두 점수 수정자로 취급한다.

```js
const relicBonuses = getRelicBonuses(relics, scoreContext);
const augmentBonuses = getAugmentBonuses(context.augments ?? [], scoreContext);
const bonusTotals = [...relicBonuses, ...augmentBonuses].reduce(addScoreBonuses, emptyScoreBonus());
```

반환값에는 유물과 증강을 분리해서 넣는다.

```js
return {
  relicBonuses,
  augmentBonuses,
  tileScoreBonus: bonusTotals.tileScoreBonus,
  yakuScoreBonus: bonusTotals.yakuScoreBonus,
  tileMultiplier,
  yakuMultiplier,
  globalMultiplier,
  totalScore,
};
```

이 방식의 장점은 다음과 같다.

- 기존 유물 점수 계산을 크게 바꾸지 않는다.
- UI에서는 유물과 증강을 따로 보여줄 수 있다.
- 점수 합산은 하나의 경로로 처리되어 밸런스와 테스트가 단순하다.

## 상태 구조 변경

`newRun()`, `newTitle()`, `newTutorial()`에 `augments`를 추가한다.

```js
{
  relics: [],
  augments: [],
  rewardOptions: [],
  rewardType: "relic"
}
```

튜토리얼은 처음에는 증강 없이 둔다. 이후 증강 튜토리얼이 필요하면 별도 고정 증강을 넣는다.

## 보상 흐름

시작 보상은 기존처럼 유물 3택 1을 유지한다.

라운드 통과 보상은 증강을 섞는다. 추천안은 다음 중 하나다.

### 안 A. 보상 타입 랜덤

- 시작 보상: 유물 3택 1
- 라운드 통과 보상: 70% 확률로 증강 3택 1, 30% 확률로 유물 3택 1

장점:

- 구현이 단순하다.
- 유물과 증강의 정체성이 분리된다.

단점:

- 특정 판에서 원하는 보상 타입을 고르지 못할 수 있다.

### 안 B. 혼합 보상

- 시작 보상: 유물 3택 1
- 라운드 통과 보상: 유물 1개 + 증강 2개 중 1개 선택

장점:

- 매번 유물과 증강을 비교하는 선택이 생긴다.
- 플레이어가 보상 타입을 직접 선택할 수 있다.

단점:

- 보상 UI가 타입 혼합을 명확히 보여줘야 한다.

초기 구현은 안 B를 권장한다. 선택지가 더 읽기 쉽고, 증강이 새 시스템이라는 점을 플레이어에게 자연스럽게 노출한다.

## 보상 선택 로직

현재 `chooseRelic()`와 `getRewardOptions()`는 유물 전용이다. 공용 보상 함수로 확장한다.

```js
function getRewardOptions(state) {
  if (state.status === "startReward") {
    return getRelicRewardOptions(state.relics, 3);
  }

  return getMixedRewardOptions(state);
}
```

보상 항목에는 타입을 붙인다.

```js
{
  type: "augment",
  item: augment
}
```

선택 함수는 다음처럼 통합한다.

```js
export function chooseReward(state, rewardId) {
  const reward = state.rewardOptions.find((item) => item.item.id === rewardId);
  if (!reward) return state;

  if (reward.type === "relic") return addRelicReward(state, reward.item);
  if (reward.type === "augment") return addAugmentReward(state, reward.item);
  return state;
}
```

기존 이벤트의 `data-relic`는 `data-reward-id`로 바꾼다.

## UI 변경

### 점수 패널

`src/ui/render/score.js`에서 유물 보너스 아래에 증강 보너스를 추가한다.

예시 표시:

```text
탕야오 단련    역 +12
칠대자 비전    역 x+0.4
5만 조율       패 +8
```

### 보유 목록

`src/ui/render/game.js`의 정보 영역을 다음처럼 나눈다.

- 점수
- 유물
- 증강

증강이 없을 때는 빈 카드 목록 대신 짧은 빈 상태 문구를 표시한다.

### 보상 모달

`renderReward()`를 유물/증강 공용으로 바꾼다.

```html
<button class="reward reward-augment rarity-common" data-reward-id="tanyao-focus">
```

표시 요소:

- 타입 라벨: 유물 / 증강
- 희귀도
- 이름
- 설명

## 밸런스 초안

초기 수치는 보수적으로 잡는다.

| 증강 유형 | 일반 | 희귀 | 전설 |
| --- | ---: | ---: | ---: |
| 특정 역 점수 보너스 | +8 ~ +14 | +15 ~ +24 | +25 ~ +40 |
| 특정 역 배수 보너스 | +0.2 ~ +0.3 | +0.35 ~ +0.5 | +0.6 ~ +0.8 |
| 특정 패 1장당 점수 | +2 ~ +4 | +5 ~ +7 | +8 이상 |
| 패 그룹 1장당 점수 | +1 ~ +3 | +4 ~ +5 | +6 이상 |
| 조건부 패 배수 | +0.2 ~ +0.3 | +0.35 ~ +0.45 | +0.5 ~ +0.7 |

유물과 증강의 역할은 다음처럼 나눈다.

- 유물: 빌드 방향을 바꾸는 큰 규칙 또는 조건부 효과
- 증강: 특정 패와 역을 성장시키는 누적 강화

## 초기 증강 후보

```json
[
  {
    "id": "tanyao-focus",
    "name": "탕야오 단련",
    "rarity": "common",
    "target": { "type": "yaku", "id": "tanyao" },
    "effect": { "type": "targetYakuScoreBonus", "score": 12 },
    "text": "탕야오가 붙으면 역 점수 +12점"
  },
  {
    "id": "pinfu-tempo",
    "name": "핑후 박자",
    "rarity": "common",
    "target": { "type": "yaku", "id": "pinfu" },
    "effect": { "type": "targetYakuMultiplierBonus", "multiplier": 0.25 },
    "text": "핑후가 붙으면 역 배수 +0.25"
  },
  {
    "id": "seven-pair-secret",
    "name": "칠대자 비전",
    "rarity": "rare",
    "target": { "type": "yaku", "id": "chiitoitsu" },
    "effect": { "type": "targetYakuScoreBonus", "score": 22 },
    "text": "칠대자가 붙으면 역 점수 +22점"
  },
  {
    "id": "five-manzu-tuning",
    "name": "5만 조율",
    "rarity": "common",
    "target": { "type": "tileFace", "suit": "m", "value": 5 },
    "effect": { "type": "targetTileScoreBonus", "scorePerTile": 4 },
    "text": "5만 1장마다 패 점수 +4점"
  },
  {
    "id": "honor-growth",
    "name": "자패 성장",
    "rarity": "common",
    "target": { "type": "tileGroup", "group": "honor" },
    "effect": { "type": "tileGroupScoreBonus", "scorePerTile": 3 },
    "text": "자패 1장마다 패 점수 +3점"
  },
  {
    "id": "simple-acceleration",
    "name": "중장패 가속",
    "rarity": "rare",
    "target": { "type": "tileGroup", "group": "simple" },
    "effect": { "type": "tileGroupThresholdMultiplierBonus", "threshold": 10, "multiplier": 0.35 },
    "text": "2~8 수패가 10장 이상이면 패 배수 +0.35"
  }
]
```

## 데이터 검증

`scripts/check-augments.mjs`를 추가한다.

검증 항목:

- `src/data/augments.json`이 배열인지 확인한다.
- `id`, `name`, `rarity`, `text`, `target`, `effect`가 있는지 확인한다.
- `id`가 중복되지 않는지 확인한다.
- `rarity`가 허용된 값인지 확인한다.
- `target.type`이 허용된 값인지 확인한다.
- `target.type === "yaku"`이면 `yakuDefinitions`에 존재하는 역 id인지 확인한다.
- `target.type === "tileFace"`이면 suit/value가 유효한지 확인한다.
- `target.type === "tileGroup"`이면 group이 허용된 값인지 확인한다.
- `effect.type`이 `augmentEffectHandlers`에 존재하는지 확인한다.
- 효과 타입별 필수 필드가 있는지 확인한다.

`package.json`의 `check` 스크립트에 추가한다.

```json
"check": "node --check ... && node scripts/check-relics.mjs && node scripts/check-augments.mjs && node scripts/check-yaku.mjs"
```

## 점수 회귀 테스트

`scripts/check-yaku.mjs`에 다음 케이스를 추가한다.

- 탕야오 증강 보유 시 탕야오 손패의 점수가 오른다.
- 탕야오 증강 보유 시 탕야오가 없는 손패의 점수는 오르지 않는다.
- 특정 패 증강은 미완성 손패에도 패 점수로 반영된다.
- 특정 역 증강은 완성 손패에 해당 역이 있을 때만 반영된다.
- 유물과 증강 보너스가 함께 합산된다.
- 증강 보너스가 `relicBonuses`가 아닌 `augmentBonuses`에 기록된다.

## 구현 순서

1. `src/data/augments.json`을 추가한다.
2. `src/game/augment-effects.js`를 추가하고 초기 효과 핸들러를 구현한다.
3. `src/game/augments.js`를 추가해 JSON 데이터를 런타임 객체로 조립한다.
4. `scoreHand()`가 `context.augments`를 읽어 증강 보너스를 계산하도록 확장한다.
5. `newRun()`, `newTitle()`, `newTutorial()`에 `augments`를 추가한다.
6. 보상 옵션을 유물/증강 공용 구조로 바꾼다.
7. 이벤트 핸들러를 `chooseRelic()` 중심에서 `chooseReward()` 중심으로 바꾼다.
8. 점수 UI에 `augmentBonuses`를 표시한다.
9. 보유 목록 UI에 증강 섹션을 추가한다.
10. `scripts/check-augments.mjs`를 추가한다.
11. `scripts/check-yaku.mjs`에 회귀 테스트를 추가한다.
12. `npm run check`와 `npm run build`로 검증한다.

## 리스크와 결정 사항

### 1. 유물과 증강의 차별화

증강이 유물과 비슷하게 느껴질 수 있다. 이를 피하려면 유물은 조건부 규칙 변화, 증강은 특정 패/역 성장으로 역할을 나눈다.

### 2. 배수 인플레이션

특정 역 배수와 전체 배수 증강이 누적되면 최종 점수가 급격히 커질 수 있다. 초기에는 전체 배수 증강을 전설급으로 제한하고, 일반/희귀 증강은 점수 보너스 중심으로 둔다.

### 3. 보상 UI 복잡도

혼합 보상을 쓰면 유물과 증강을 한 모달에서 보여줘야 한다. 카드에 타입 라벨을 명확히 넣어 선택 의미를 분리한다.

### 4. `scoreHand()` 시그니처

기존 호출부가 많기 때문에 시그니처 자체는 유지한다. 증강은 `context.augments`로 전달해 호환성을 지킨다.

## 완료 기준

- 플레이어 상태에 `augments`가 저장된다.
- 라운드 보상에서 증강을 선택할 수 있다.
- 특정 패 증강이 패 점수에 반영된다.
- 특정 역 증강이 역 점수 또는 역 배수에 반영된다.
- 점수 상세에 증강 보너스가 표시된다.
- 보유 증강 목록이 UI에 표시된다.
- 증강 데이터 검증 스크립트가 통과한다.
- 기존 유물 보상과 점수 계산이 회귀 없이 동작한다.
- `npm run check`와 `npm run build`가 통과한다.
