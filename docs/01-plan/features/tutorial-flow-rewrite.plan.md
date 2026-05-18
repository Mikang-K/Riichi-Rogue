# 튜토리얼 흐름 재작성 구현 계획

## 목표

현재 튜토리얼은 고정 손패에서 `동`을 교환하고 조합을 제출하는 짧은 안내만 제공한다. 지금 게임에는 시작 유물, 라운드 클리어, 코인 보상, 상점, 패 강화/추가/삭제, 다음 라운드 진입이 추가되었으므로 튜토리얼도 실제 게임 흐름을 따라가도록 다시 작성한다.

새 튜토리얼의 목표는 플레이어가 다음 순서를 직접 따라 하게 만드는 것이다.

1. 시작 유물 선택
2. 손패 확인
3. 불필요한 패 선택
4. 패 교환
5. 완성 조합 제출
6. 목표 점수와 코인 보상 확인
7. 상점에서 유물/증강 확인
8. 패 강화, 추가, 삭제 중 하나 이상 실행
9. 다음 라운드 시작
10. 본 게임으로 이동

## 현재 구조 요약

- `newTutorial()`은 `status: "tutorial"`로 바로 플레이 화면에 진입한다.
- 튜토리얼은 `relics: [relicPool[0]]`로 시작 유물을 이미 들고 있다.
- `finishScoredHand()`는 튜토리얼 성공 시 `status: "tutorialComplete"`로 끝낸다.
- 상점은 본 게임 라운드 성공 시에만 `status: "shop"`으로 열린다.
- `renderTutorialGuide(state, score)`는 플레이 중 화면 안에 단계 설명을 보여준다.
- `renderTutorialComplete(score)`는 튜토리얼 완료 모달만 표시한다.

따라서 현재 튜토리얼은 상점과 런 진행을 경험할 수 없다.

## 설계 방향

튜토리얼을 완전히 별도 미니 게임으로 만들기보다, 기존 게임 상태와 액션을 최대한 재사용한다. 단, 안내가 흔들리지 않도록 튜토리얼 전용 고정 데이터와 단계 상태를 둔다.

### 핵심 변경

`state.tutorial`을 추가한다.

```js
tutorial: {
  step: "startReward",
  completedSteps: [],
  hasVisitedShop: false,
  hasEditedTile: false,
  hasStartedNextRound: false,
}
```

단계는 명시적인 문자열로 관리한다.

```js
const tutorialSteps = [
  "startReward",
  "selectDiscard",
  "exchange",
  "submit",
  "shopIntro",
  "shopEdit",
  "nextRound",
  "complete",
];
```

UI는 현재 상태에서 자동으로 `step`을 추론할 수 있지만, 명시 상태를 두면 버튼 비활성화, 안내 문구, 완료 조건 관리가 쉬워진다.

## 튜토리얼 흐름

### 1. 시작 유물 선택

현재 `newTutorial()`은 유물을 이미 지급한다. 이를 다음처럼 바꾼다.

- `status: "startReward"`
- `mode: "tutorial"`
- `rewardOptions: getTutorialStartRewardOptions()`
- `message: "시작 유물을 하나 선택하세요. 유물은 런 동안 계속 효과를 줍니다."`

튜토리얼 시작 유물 후보는 고정한다.

권장 후보:

- `대나무 렌즈`: 특정 슌쯔 점수 증가
- `도라 방울`: 도라 이해
- `여분의 패산`: 교환 횟수 증가 이해

선택하면 기존 `chooseReward()` 흐름을 사용하되, 튜토리얼에서는 `startRound()`가 아니라 고정 튜토리얼 손패로 진입해야 한다.

### 2. 손패와 교환 안내

현재 고정 손패는 유지한다.

- 완성 직전 손패
- `동`을 버리면 `6통`이 들어와 완성
- 교환 횟수는 1회

안내 문구는 다음 목표를 분명히 한다.

- 목표 점수
- 현재 점수
- 왜 아직 제출하면 안 되는지
- 어떤 패를 선택해야 하는지

필요하면 튜토리얼 중에는 리치/깡 버튼을 숨기거나 비활성화한다. 1차 구현에서는 버튼은 그대로 두되, `mode === "tutorial"`일 때 리치/깡은 비활성화하는 편이 흐름을 덜 흐린다.

### 3. 조합 제출과 라운드 클리어

현재 튜토리얼 성공은 곧바로 `tutorialComplete`로 끝난다. 변경 후에는 상점으로 이동한다.

튜토리얼 성공 시:

```js
status: "shop"
coins: state.coins + tutorialCoinReward.totalCoins
shop: createTutorialShopState(state, result)
tutorial.step = "shopIntro"
```

튜토리얼 코인 보상은 고정값이 좋다.

```js
const TUTORIAL_CLEAR_COINS = 10;
```

이유:

- 상점에서 유물/증강과 패 편집을 모두 시도할 수 있어야 한다.
- 점수 공식 설명은 본 게임에서 다뤄도 된다.

### 4. 튜토리얼 상점

상점 후보도 고정한다.

왼쪽:

- 유물 1개: `여분의 패산` 또는 `도라 방울`
- 증강 1개: 현재 손패나 다음 라운드에서 효과가 보이는 단순 증강

오른쪽:

- 강화 후보 3개
- 추가 후보 3개
- 삭제 후보 3개

각 후보는 현재 `playerTiles`에서 뽑는 랜덤 방식 대신 튜토리얼용 고정 후보를 사용한다.

예시:

- 강화: `6통`, `2만`, `백`
- 추가: `6통`, `3만`, `4만`
- 삭제: `동`, `남`, `9삭`

단, 현재 튜토리얼 `playerTiles`가 전체 136장으로 시작하므로 “내 덱 중 3개”라는 감각이 약하다. 튜토리얼에서는 축소된 `playerTiles`를 사용하도록 바꾸는 것을 권장한다.

```js
playerTiles: buildTutorialPlayerTiles()
```

`buildTutorialPlayerTiles()`는 20~30장 정도의 작은 패 풀로 만든다. 이렇게 하면 상점에서 패를 추가/삭제하는 의미가 더 잘 보인다.

### 5. 패 편집 안내

튜토리얼 상점에서는 한 가지 편집만 필수로 요구한다.

권장 필수 행동: 패 강화

이유:

- 삭제는 “마지막 1장 삭제 불가” 같은 예외 설명이 필요하다.
- 추가/삭제는 다음 라운드에서야 체감된다.
- 강화는 점수 계산에 즉시 설명하기 쉽다.

흐름:

1. 상점 오른쪽의 `강화` 그룹을 강조한다.
2. 플레이어가 3개 중 하나를 강화한다.
3. `tutorial.hasEditedTile = true`
4. 안내가 “이제 다음 라운드로 이동하세요”로 바뀐다.

추가/삭제는 선택 행동으로 열어둔다.

### 6. 다음 라운드 시작

`leaveShop()` 호출 후 튜토리얼은 본 게임처럼 무작위 라운드에 들어가는 대신, 튜토리얼 2번째 고정 라운드로 들어가야 한다.

선택지:

- A안: 다음 라운드 화면까지만 보여주고 `tutorialComplete` 모달 표시
- B안: 실제로 한 번 더 조합을 제출하게 한다

권장: A안.

처음 튜토리얼의 목적은 전체 흐름 이해이므로, 상점 후 다음 라운드 화면에 진입한 순간 “이제 본 게임을 시작할 준비가 되었습니다” 모달을 띄운다.

구현:

```js
if (state.mode === "tutorial" && state.status === "shop") {
  return {
    ...startTutorialSecondRound(state),
    status: "tutorialComplete",
    tutorial: { ...state.tutorial, step: "complete", hasStartedNextRound: true },
  };
}
```

또는 더 자연스럽게 하려면 두 번째 라운드 화면을 먼저 렌더하고, `renderTutorialGuide()`가 “본 게임 시작” 버튼을 보여주게 한다.

## 필요한 코드 변경

### `src/game.js`

추가/변경할 함수:

- `newTutorial()`
- `chooseReward()`
- `chooseRelicReward()`
- `finishScoredHand()`
- `leaveShop()`
- `createTutorialShopState()`
- `buildTutorialPlayerTiles()`
- `getTutorialStartRewardOptions()`
- `startTutorialRound()`
- `completeTutorialAfterShop()`

핵심 분기:

- `mode === "tutorial"`일 때 시작 유물 선택 후 고정 튜토리얼 라운드 시작
- `mode === "tutorial"`일 때 라운드 성공 후 `tutorialComplete`가 아니라 `shop`
- `mode === "tutorial"`일 때 상점 후보를 고정값으로 생성
- `mode === "tutorial"`일 때 `leaveShop()` 후 튜토리얼 완료 처리

### `src/ui/render/tutorial.js`

현재 4단계 안내를 새 흐름에 맞게 확장한다.

단계:

1. 시작 유물 선택
2. 손패 구조 확인
3. 동 선택
4. 선택한 패 교환
5. 조합 제출
6. 보상과 상점 확인
7. 패 강화 선택
8. 다음 라운드 시작

`state.status`와 `state.tutorial.step`에 따라 현재 단계를 강조한다.

### `src/ui/render/shop.js`

튜토리얼 중에는 상점 설명을 조금 더 친절하게 보여준다.

예:

- “왼쪽은 유물과 증강입니다.”
- “오른쪽은 덱을 바꾸는 패 편집입니다.”
- “이번 튜토리얼에서는 강화 1회를 해보세요.”

단, 일반 게임에서는 설명을 길게 보여주지 않는다.

### `src/ui/render/game.js`

튜토리얼일 때 리치/깡 버튼을 숨기거나 비활성화하는 옵션을 검토한다.

권장:

- 튜토리얼 1차에서는 리치/깡을 숨긴다.
- 본 게임에서는 그대로 표시한다.

## 상태 전이 표

| 상태 | 플레이어 행동 | 다음 상태 |
| --- | --- | --- |
| `startReward` | 시작 유물 선택 | `tutorial` |
| `tutorial` | 동 선택 | `tutorial` |
| `tutorial` | 선택한 패 교환 | `tutorial` |
| `tutorial` | 조합 제출 성공 | `shop` |
| `shop` | 패 강화 | `shop` |
| `shop` | 다음 라운드 | `tutorialComplete` |
| `tutorialComplete` | 본 게임 시작 | `startReward` 또는 `playing` |

## UI 문구 초안

### 시작 유물

“유물은 런 동안 계속 적용되는 강화입니다. 하나를 골라 연습국을 시작하세요.”

### 손패

“손패는 4개의 묶음과 1개의 머리로 완성됩니다. 지금은 동 하나만 조합에 맞지 않습니다.”

### 교환

“동을 선택한 뒤 ‘선택한 패 교환’을 누르세요. 교환 횟수는 라운드마다 제한됩니다.”

### 제출

“완성된 손패는 ‘조합 제출’로 점수를 확정합니다. 목표 점수를 넘기면 라운드를 클리어합니다.”

### 상점

“라운드를 클리어하면 코인을 받고 상점에 들어갑니다. 왼쪽에서는 유물과 증강을 사고, 오른쪽에서는 덱의 패를 강화·추가·삭제할 수 있습니다.”

### 패 강화

“이번에는 강화 후보 3개 중 하나를 골라 보세요. 강화된 패는 다음 라운드 점수 계산에 반영됩니다.”

### 완료

“이제 한 라운드를 클리어하고 상점에서 덱을 바꾸는 흐름을 익혔습니다. 본 게임에서는 이 과정을 반복해 오라스까지 완주합니다.”

## 검증 계획

1. `npm run check`
2. `npm run build`
3. 수동 플로우 확인
   - 튜토리얼 시작
   - 시작 유물 선택
   - 동 선택
   - 패 교환
   - 조합 제출
   - 상점 진입
   - 강화 후보 3개 표시
   - 강화 구매
   - 다음 라운드 클릭
   - 튜토리얼 완료 모달 표시
4. 회귀 확인
   - 본 게임 시작 유물 선택 흐름 유지
   - 본 게임 라운드 클리어 후 상점 흐름 유지
   - 상점 일반 랜덤 후보 유지

## 1차 구현 범위

1차 구현에서는 다음까지만 한다.

- 시작 유물 선택 포함
- 고정 손패 교환/제출
- 클리어 후 튜토리얼 상점 진입
- 고정 상점 후보 표시
- 패 강화 1회 필수
- 다음 라운드 클릭 시 튜토리얼 완료

추가/삭제 필수 체험, 리치/깡 튜토리얼, 두 번째 라운드 실제 플레이는 2차 튜토리얼로 분리한다.
