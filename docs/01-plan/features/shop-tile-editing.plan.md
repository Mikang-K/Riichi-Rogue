# 라운드 클리어 상점 및 패 편집 기능 구현 계획

## 목표

라운드를 클리어하면 즉시 보상 선택으로 넘어가는 현재 흐름을 상점 단계로 확장한다. 상점에서는 재화를 사용해 다음 효과를 얻을 수 있다.

- 유물 구매
- 증강 구매
- 패 자체 강화
- 패 추가
- 패 삭제
- 기존 마작에는 없는 패 구성, 역, 유물, 증강을 만드는 방향의 런 변형

재화는 라운드 클리어 시 지급한다. 지급량은 기본 보상과 목표 점수 초과분에 대한 보너스로 계산하며, 초과 보너스에는 상한을 둔다.

## 현재 구조 요약

- `src/game.js`
  - `finishScoredHand()`가 라운드 성공/실패, 코인 지급, 보상 진입을 담당한다.
  - 현재 코인은 `scoreToCoins(result.totalScore)`로 총점 기준 지급된다.
  - 라운드 성공 시 `status: "reward"`와 `rewardOptions`를 설정한다.
  - `chooseReward()`가 유물/증강 보상을 고르면 즉시 `startRound()`로 다음 라운드를 시작한다.
- `src/ui/render/game.js`
  - `state.status === "reward"`일 때 `renderReward()` 모달을 띄운다.
  - 상단 상태에 `state.coins`를 표시한다.
- `src/ui/events.js`
  - `data-reward-id` 클릭을 `chooseReward()`로 연결한다.
- `src/game/relic-effects.js`
  - 유물의 플레이어 효과는 현재 `maxDiscardsDelta`만 있다.
  - 상점 삭제/추가 횟수 증감 유물을 넣으려면 플레이어 효과 타입을 확장하면 된다.

## 핵심 설계

### 1. 라운드 클리어 후 상태 전환

현재:

```js
status: "reward"
rewardOptions: getRewardOptions(state)
```

변경:

```js
status: "shop"
shop: createShopState(state, result)
```

상점 진입 시점은 `finishScoredHand()` 내부의 다음 라운드 분기 직전이다. 최종 라운드 클리어는 현재처럼 `won`으로 끝내되, 원하면 최종 클리어 전 마지막 상점은 생략한다.

권장 흐름:

1. 라운드 성공
2. 코인 지급
3. 상점 입장
4. 원하는 구매/패 편집 수행
5. `다음 라운드` 버튼으로 `startRound()` 실행

이렇게 하면 기존 “보상을 고르면 즉시 다음 라운드”보다 플레이어가 구매 순서를 직접 정할 수 있다.

### 2. 재화 지급 공식

현재 `scoreToCoins(score)`는 총점만 본다. 목표 점수를 넘은 정도를 반영하려면 목표 점수와 결과 점수를 함께 받는 함수로 바꾼다.

```js
const ROUND_CLEAR_BASE_COINS = 4;
const OVER_SCORE_PER_BONUS_COIN = 25;
const MAX_OVER_SCORE_BONUS_COINS = 6;

function getRoundClearCoins(totalScore, targetScore) {
  const overScore = Math.max(0, totalScore - targetScore);
  const bonusCoins = Math.min(
    MAX_OVER_SCORE_BONUS_COINS,
    Math.floor(overScore / OVER_SCORE_PER_BONUS_COIN),
  );
  return {
    baseCoins: ROUND_CLEAR_BASE_COINS,
    bonusCoins,
    totalCoins: ROUND_CLEAR_BASE_COINS + bonusCoins,
    overScore,
  };
}
```

`finishScoredHand()`에서는 `coinReward`를 계산해 `state.coins`에 더하고, `shop.lastReward`에 표시용 breakdown을 저장한다.

```js
const coinReward = getRoundClearCoins(result.totalScore, targetScore);
coins: state.coins + coinReward.totalCoins
```

튜토리얼은 코인 지급 대상에서 제외하거나, 별도 고정값 0으로 둔다.

### 3. 상점 상태 구조

`state.shop`은 라운드 사이에서만 살아 있는 임시 상태로 둔다.

```js
shop: {
  roundIndex: state.roundIndex,
  lastScore: result.totalScore,
  lastTargetScore: targetScore,
  lastReward: {
    baseCoins,
    bonusCoins,
    totalCoins,
    overScore,
  },
  offers: {
    relics: [],
    augments: [],
    tileUpgrades: [],
    tileAdds: [],
  },
  editsUsed: {
    removeTile: 0,
    addTile: 0,
    upgradeTile: 0,
  },
  editsLimit: {
    removeTile: 1,
    addTile: 1,
    upgradeTile: 1,
  },
  selectedTileId: null,
}
```

상점 1번당 제한 횟수가 필요한 기능은 `editsUsed`와 `editsLimit`로 관리한다. 유물 효과는 `editsLimit`을 바꾸는 방식으로 적용한다.

### 4. 상점 상품

1차 구현에서는 상품 풀을 너무 크게 만들기보다 고정 카테고리와 랜덤 후보를 섞는다.

```js
const SHOP_PRICES = {
  relicCommon: 6,
  relicRare: 9,
  relicLegendary: 13,
  augmentCommon: 4,
  augmentRare: 7,
  augmentLegendary: 10,
  tileUpgrade: 4,
  tileAdd: 3,
  tileRemove: 5,
};
```

상점 진입 시 생성:

- 유물 2개
- 증강 2개
- 추가 가능한 패 후보 3개
- 패 강화 옵션 2개
- 패 삭제는 상품 목록이 아니라 액션으로 제공

유물/증강은 기존 `drawWeightedItems()` 계열을 재사용한다. 이미 보유한 유물/증강은 후보에서 제외한다.

### 5. 패 자체 강화 모델

현재 `augments`는 “특정 역/패 얼굴/패 그룹에 보너스”를 주는 런 단위 강화다. “패 자체 강화”는 손패에 있는 특정 복사본 또는 특정 얼굴에 강화 속성을 붙이는 새 모델이 필요하다.

권장 1차 모델:

```js
tile.enhancement = {
  id: "polished",
  name: "광택",
  tileScoreBonus: 3,
}
```

`getTileBaseScore(tile)` 또는 점수 계산 전용 함수에서 `tile.enhancement`를 반영한다.

```js
function getTileScore(tile) {
  return getTileBaseScore(tile) + (tile.enhancement?.tileScoreBonus ?? 0);
}
```

주의점:

- 현재 라운드 시작 때마다 `startRound()`가 새 벽에서 14장을 뽑기 때문에, 손패에 직접 붙인 강화는 다음 라운드로 이어지지 않는다.
- 로그라이크식 “덱 빌딩”을 원한다면 `deck`과 별개로 `playerTiles` 또는 `tileBag`을 만들어야 한다.

따라서 이 기능의 의도에 따라 두 갈래 중 하나를 선택한다.

#### A안: 현재 손패 편집형

상점에서 현재 손패를 편집하고 바로 다음 라운드에 가져간다.

- `startRound()`가 새 손패를 뽑지 않고, 상점에서 만든 `state.hand`를 다음 라운드 시작 손패로 사용해야 한다.
- 마작의 벽/도라/영상패 구성과 충돌할 수 있어, “다음 라운드의 시작 손패를 직접 구성한다”는 게임 규칙으로 명확히 잡아야 한다.

#### B안: 런 덱 편집형

플레이어 전용 패 풀을 만들고, 매 라운드 그 풀에서 14장을 뽑는다.

```js
playerTiles: buildStartingPlayerTiles()
```

- 패 추가/삭제/강화는 `playerTiles`를 수정한다.
- `startRound()`는 `setupWall()` 대신 `setupPlayerRound(state.playerTiles)` 같은 흐름으로 시작 손패를 만든다.
- 패 수와 같은 얼굴 수는 제한하지 않는다. 오히려 같은 얼굴 5장 이상, 극단적으로 얇거나 두꺼운 패 풀, 특정 패만 과도하게 많은 구성이 새 역과 시너지를 만들 수 있는 축이 된다.

권장: B안. “상점에서 패 자체를 강화/추가/삭제”라는 표현은 런 동안 유지되는 덱 빌딩에 더 가깝고, 유물로 횟수를 늘리고 줄이는 설계와도 잘 맞는다.

### 6. 패 추가/삭제 규칙

기본 규칙:

- 삭제: 상점 1회당 기본 1번
- 추가: 상점 1회당 기본 1번
- 강화: 상점 1회당 기본 1번
- 각 액션은 코인을 소비한다.
- 패 풀 전체 수에는 제한을 두지 않는다.
- 같은 얼굴의 보유 수에도 제한을 두지 않는다.
- 삭제로 패 풀이 14장보다 적어질 수 있다. 이 경우 `startRound()`는 부족한 만큼 현재 패 풀에서 반복 샘플링하거나, 별도 보충 규칙을 적용한다.
- 추천 보충 규칙은 “부족한 만큼 `playerTiles`에서 복사본을 만들어 채운다”이다. 이렇게 하면 패 풀이 작을수록 의도적으로 같은 패가 자주 나오는 전략이 성립한다.

상점 액션 예시:

```js
export function buyTileRemoval(state, tileId) {}
export function buyTileAdd(state, offerId) {}
export function buyTileUpgrade(state, tileId, upgradeId) {}
export function buyShopReward(state, offerId) {}
export function leaveShop(state) {}
```

각 함수는 다음을 공통으로 검사한다.

- `state.status === "shop"`
- 코인 충분 여부
- `editsUsed[type] < editsLimit[type]`
- 대상 패/상품이 존재하는지
- 패 풀 변경 후 `startRound()`가 손패를 만들 수 있는지

### 7. 유물 효과 확장

`src/game/relic-effects.js`에 플레이어 효과 타입을 추가한다.

```js
shopEditLimitDelta: ({ relic, player }) => ({
  ...player,
  shopEditLimits: {
    ...player.shopEditLimits,
    [relic.playerEffect.editType]:
      Math.max(0, player.shopEditLimits[relic.playerEffect.editType] + relic.playerEffect.delta),
  },
})
```

상태에는 런 전체 기본값을 둔다.

```js
shopEditLimits: {
  removeTile: 1,
  addTile: 1,
  upgradeTile: 1,
}
```

상점 입장 시 `editsLimit`은 `state.shopEditLimits`에서 복사한다. 유물 획득 즉시 다음 상점부터 반영하거나, 현재 상점에도 즉시 반영할지 규칙을 정해야 한다.

권장: 현재 상점에서 산 유물은 즉시 반영한다. 플레이어가 “삭제 횟수 +1” 유물을 사고 바로 삭제를 한 번 더 하는 재미가 명확하다.

### 8. UI 계획

기존 `renderReward()` 모달을 대체하거나 확장하지 말고, 상점 전용 렌더러를 둔다.

새 파일:

- `src/ui/render/shop.js`

렌더링 구성:

- 상단: 보유 코인, 이번 라운드 획득 코인 breakdown
- 좌측: 현재 패 풀 또는 다음 라운드 시작 후보 패
- 우측: 상품 목록
- 하단: 다음 라운드 버튼

필요한 이벤트 속성:

- `data-action="buy-shop-offer"`
- `data-shop-offer-id`
- `data-action="buy-tile-remove"`
- `data-action="buy-tile-upgrade"`
- `data-action="leave-shop"`

`src/ui/events.js`에서 위 액션을 새 게임 함수로 연결한다.

### 9. 구현 순서

1. 코인 보상 공식을 분리한다.
   - `scoreToCoins()`를 `getRoundClearCoins(totalScore, targetScore)`로 교체한다.
   - `finishScoredHand()` 메시지에 기본 보상/초과 보상을 표시한다.

2. 상점 상태를 추가한다.
   - `newRun()`에 `shop`, `shopEditLimits`, `playerTiles` 초기값을 넣는다.
   - `finishScoredHand()` 성공 분기에서 `status: "shop"`으로 전환한다.

3. 상점 상품 생성기를 만든다.
   - 기존 `getRelicRewardOptions()`, `getAugmentRewardOptions()`를 상점 offer 생성에 재사용한다.
   - 가격과 sold-out 상태를 offer에 포함한다.

4. 유물/증강 구매 함수를 추가한다.
   - 기존 `chooseReward()`는 시작 보상용으로 남긴다.
   - 상점용 `buyShopOffer()`는 코인을 차감하고 상품만 적용한다.
   - 구매 후 즉시 다음 라운드로 가지 않는다.

5. 패 풀 모델을 결정하고 적용한다.
  - 권장 B안: `playerTiles` 도입.
   - `startRound()`가 `playerTiles`에서 14장을 뽑도록 바꾼다.
   - `playerTiles`가 14장보다 적어도 시작 손패를 만들 수 있도록 반복 샘플링/복사 보충 규칙을 둔다.
   - 라운드 중 교환은 기존 라이브 벽을 계속 사용하되, 시작 손패만 플레이어 패 풀에서 온다는 규칙을 유지한다.

6. 패 삭제/추가/강화 액션을 구현한다.
   - 코인, 횟수, 대상 존재 여부만 검사한다.
   - 강화는 `tile.enhancement`를 붙이고 점수 계산에 반영한다.

7. 신규 역/유물/증강 확장을 고려한 판정 구조를 준비한다.
   - 같은 얼굴 5장 이상, 같은 얼굴 6장 이상, 패 풀 크기 임계값, 특정 슈트 과밀도, 특정 패 결핍 같은 조건을 역/유물/증강 효과 조건으로 쓸 수 있게 한다.
   - 기존 `evaluateYaku()`는 실제 마작 역 판정으로 유지하고, 로그라이크 전용 역은 별도 데이터 또는 별도 evaluator 계층으로 분리하는 편이 안전하다.
   - 예: `evaluateRogueYaku(tiles, analysis, context)`를 추가하고 `scoreHand()`에서 기존 역과 합산한다.

8. 상점 UI를 구현한다.
   - `renderShop()` 추가.
   - `renderOverlays()`에서 `state.status === "shop"`일 때 상점 모달을 표시한다.
   - 패 선택/삭제/강화 버튼 상태를 명확히 비활성화한다.

9. 유물 플레이어 효과를 확장한다.
   - `shopEditLimitDelta`
   - 필요하면 `shopDiscount`, `bonusClearCoins`, `extraTileAddOffer`, `copyTileOnAdd`, `duplicateEnhancedTile` 같은 후속 타입을 추가한다.

10. 검증을 추가한다.
   - `npm run check`
   - 상점 진입, 구매, 코인 부족, 횟수 제한, 14장 미만 패 풀의 시작 손패 생성, 같은 얼굴 5장 이상 구성, 다음 라운드 시작 손패 반영을 수동 테스트한다.

## 밸런스 초안

- 기본 클리어 보상: 4코인
- 초과 점수 보너스: 목표 초과 25점당 +1코인
- 초과 보너스 상한: +6코인
- 유물 가격: common 6, rare 9, legendary 13
- 증강 가격: common 4, rare 7, legendary 10
- 패 추가: 3코인
- 패 삭제: 5코인
- 패 강화: 4코인

이 초안이면 한 라운드 보상으로 보통 1개, 고득점이면 2개 행동까지 가능하다. 삭제는 덱 압축 효과가 강하므로 추가보다 비싸게 둔다.

## 위험 지점

- 현재 코드의 `deck`은 라운드 중 교환용 벽이다. 상점에서 편집하는 대상과 같은 이름을 쓰면 규칙이 섞이므로 `playerTiles`와 `deck`을 분리해야 한다.
- 패 강화가 `copyId` 기준이면 삭제/추가/라운드 시작 과정에서 ID 보존이 중요하다.
- 패 수와 같은 얼굴 수 제한을 없애면 기존 마작 역만으로는 의도한 재미가 충분히 나오지 않을 수 있다. 제한 해제를 정식 규칙으로 삼고, 그 위에서 작동하는 로그라이크 전용 역/유물/증강을 함께 추가해야 한다.
- `playerTiles`가 0장이 되는 상황은 시작 손패를 만들 수 없으므로, 삭제 액션만큼은 “마지막 1장 삭제 불가” 또는 “빈 패 풀일 때 기본 패 자동 생성” 중 하나의 방어 규칙이 필요하다.
- 상점에서 유물을 산 뒤 즉시 플레이어 효과를 반영하면 기존 `applyRelicPlayerEffect()`가 `maxDiscards`만 받는 구조라 확장이 필요하다.
- UI 문자열이 현재 일부 인코딩이 깨져 보이므로, 상점 UI를 추가할 때 기존 파일 인코딩을 먼저 정리하는 작업이 필요할 수 있다.

## 1차 범위 권장안

1차 구현은 다음 범위로 제한한다.

- 라운드 클리어 코인 공식 변경
- 라운드 후 `shop` 상태 추가
- 유물/증강 구매
- 패 삭제 1회
- 패 추가 1회
- 패 강화 1회
- `playerTiles` 기반 시작 손패
- 14장 미만 패 풀 보충 규칙
- 같은 얼굴 수 제한 없는 패 풀
- 로그라이크 전용 역 판정 확장 지점
- 유물로 상점 편집 횟수 증감

할인, reroll, 상품 잠금, 희귀한 패 추가, 강화 종류 다양화, 전용 역 데이터 대량 추가는 2차로 미루는 편이 좋다.
