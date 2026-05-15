# 유물 데이터 JSON 분리 구현 계획

## 목표

현재 `src/game.js`에 직접 선언되어 있는 `relicPool`을 별도 JSON 데이터 파일로 분리한다.

주요 목적은 다음과 같다.

- 유물 추가, 수정, 밸런스 조정을 `src/game.js` 수정 없이 처리한다.
- 유물의 표시 데이터와 효과 구현 로직을 분리한다.
- JSON 데이터 검증을 통해 오타나 누락을 조기에 발견한다.
- 이후 유물 수가 늘어나도 관리 가능한 구조를 만든다.

## 현재 구조

현재 `src/game.js`는 다음 역할을 함께 가지고 있다.

- 라운드, 점수, 리치, 도라 등 게임 진행 로직
- `relicRarities` 희귀도 정의
- `relicPool` 유물 목록 정의
- 유물 보상 추첨
- 유물 점수 효과 적용
- 유물 플레이어 효과 적용

특히 `relicPool` 안에는 표시 데이터와 함수형 로직이 함께 들어 있다.

```js
{
  id: "dora-mirror",
  name: "도라 거울",
  rarity: "rare",
  text: "도라 1장마다 역 점수 +18점",
  effect: ({ doraCount }) => ({ yakuScoreBonus: doraCount * 18 }),
}
```

이 구조는 유물 수가 적을 때는 단순하지만, 유물 추가와 수정이 반복되면 다음 문제가 생긴다.

- `src/game.js`가 계속 커진다.
- 유물 텍스트 수정 같은 단순 작업도 게임 핵심 로직 파일을 건드리게 된다.
- 유물 효과 함수가 데이터 사이에 섞여 있어 목록 검토가 어렵다.
- JSON이나 스프레드시트 기반 관리로 확장하기 어렵다.

## 핵심 설계

JSON에는 순수 데이터만 둔다. 함수는 JSON에 저장하지 않는다.

대신 각 유물은 효과 타입과 파라미터를 가진다.

```json
{
  "id": "dora-mirror",
  "name": "도라 거울",
  "rarity": "rare",
  "text": "도라 1장마다 역 점수 +18점",
  "effect": {
    "type": "doraCountScoreBonus",
    "scorePerDora": 18
  }
}
```

JS 쪽에서는 `effect.type`에 대응하는 핸들러를 찾아 기존 게임 로직이 기대하는 함수 형태로 조립한다.

```js
const relic = {
  ...data,
  effect: (context) => relicEffectHandlers[data.effect.type]({ relic: data, ...context }),
};
```

이 방식의 장점은 다음과 같다.

- JSON은 사람이 읽고 수정하기 쉽다.
- 효과 구현은 JS 함수로 안전하게 유지한다.
- 기존 `scoreHand`, `chooseRelic`, `getRewardOptions` 흐름을 크게 바꾸지 않아도 된다.
- 새 효과 유형이 필요할 때만 핸들러를 추가하면 된다.

## 권장 파일 구조

```text
src/
  data/
    relics.json
  game/
    relic-effects.js
    relics.js
  game.js
scripts/
  check-relics.mjs
```

### `src/data/relics.json`

유물 목록을 보관한다.

포함할 필드:

- `id`: 유물 고유 ID
- `name`: 표시 이름
- `rarity`: `common`, `rare`, `legendary`
- `text`: UI 표시 설명
- `effect`: 점수 계산 효과 데이터, 선택 필드
- `playerEffect`: 플레이어 상태 변경 효과 데이터, 선택 필드

예시:

```json
[
  {
    "id": "bamboo-lens",
    "name": "대나무 렌즈",
    "rarity": "common",
    "text": "삭수 슌쯔마다 역 점수 +8점",
    "effect": {
      "type": "sequenceSuitScoreBonus",
      "suit": "s",
      "scorePerSequence": 8
    }
  },
  {
    "id": "spare-wall",
    "name": "여분의 패산",
    "rarity": "common",
    "text": "매 라운드 교환 횟수 +1",
    "playerEffect": {
      "type": "maxDiscardsDelta",
      "delta": 1
    }
  }
]
```

### `src/game/relic-effects.js`

JSON의 효과 타입을 실제 계산 함수로 변환한다.

예시:

```js
export const relicEffectHandlers = {
  doraCountScoreBonus: ({ relic, doraCount }) => ({
    yakuScoreBonus: doraCount * relic.effect.scorePerDora,
  }),

  sequenceSuitScoreBonus: ({ relic, analysis }) => ({
    yakuScoreBonus:
      analysis.melds.filter(
        (meld) => meld.type === "sequence" && meld.tiles[0].suit === relic.effect.suit,
      ).length * relic.effect.scorePerSequence,
  }),
};

export const relicPlayerEffectHandlers = {
  maxDiscardsDelta: ({ relic, player }) => ({
    ...player,
    maxDiscards: Math.max(1, player.maxDiscards + relic.playerEffect.delta),
  }),
};
```

### `src/game/relics.js`

JSON 데이터를 import하고 기존 코드가 쓰는 `relicPool` 형태로 조립한다.

예시:

```js
import relicData from "../data/relics.json";
import { relicEffectHandlers, relicPlayerEffectHandlers } from "./relic-effects.js";

export const relicRarities = {
  common: { label: "일반", weight: 70 },
  rare: { label: "희귀", weight: 25 },
  legendary: { label: "전설", weight: 5 },
};

function attachRelicHandlers(relic) {
  return {
    ...relic,
    effect: relic.effect
      ? (context) => relicEffectHandlers[relic.effect.type]({ relic, ...context })
      : undefined,
    player: relic.playerEffect
      ? (player) => relicPlayerEffectHandlers[relic.playerEffect.type]({ relic, player })
      : undefined,
  };
}

export const relicPool = relicData.map(attachRelicHandlers);
```

### `src/game.js`

기존 `relicRarities`, `relicPool` 선언을 제거하고 다음 import로 대체한다.

```js
import { relicPool, relicRarities } from "./game/relics.js";
```

기존의 다음 함수들은 가능하면 그대로 유지한다.

- `chooseRelic`
- `scoreHand`
- `getRelicScoreBonus`
- `applyRelicPlayerEffect`
- `getRewardOptions`
- `drawWeightedRelics`
- `getRelicWeight`

## 효과 타입 설계 초안

현재 `src/game.js`의 유물 효과를 기준으로 다음 타입을 만들 수 있다.

| 타입 | 용도 |
| --- | --- |
| `sequenceSuitScoreBonus` | 특정 수패 슌쯔 수에 따라 점수 보너스 |
| `tripletThresholdScoreBonus` | 커쯔 개수가 기준 이상이면 점수 보너스 |
| `singleYakuMultiplierBonus` | 기본 역이 1개뿐이면 배수 보너스 |
| `honorTileThresholdScoreBonus` | 자패 개수가 기준 이상이면 점수 보너스 |
| `noHonorTileScoreBonus` | 자패가 없으면 점수 보너스 |
| `pairCountScoreBonus` | 또이쯔 개수마다 점수 보너스 |
| `doraPresenceScoreBonus` | 도라가 하나 이상 있으면 점수 보너스 |
| `doraCountScoreBonus` | 도라 개수마다 점수 보너스 |
| `sameNumberAllSuitsScoreBonus` | 세 수패에 같은 숫자가 있으면 점수 보너스 |
| `terminalHonorPerTileScoreBonus` | 1, 9, 자패마다 점수 보너스 |
| `allSimpleTileMultiplierBonus` | 모든 패가 2~8 수패이면 배수 보너스 |
| `sequenceThresholdMultiplierBonus` | 슌쯔 개수가 기준 이상이면 배수 보너스 |
| `tripletCountScoreBonus` | 커쯔 개수마다 점수 보너스 |
| `flushGlobalMultiplierBonus` | 한 종류 수패만 있으면 전체 배수 보너스 |
| `dragonTripletScoreBonus` | 삼원패 커쯔마다 점수 보너스 |
| `yakumanGlobalMultiplierBonus` | 역만이면 전체 배수 보너스 |
| `flatYakuMultiplierBonus` | 조건 없이 역 배수 보너스 |
| `maxDiscardsDelta` | 교환 횟수 증가 또는 감소 |

필요하면 구현 중 유사 타입을 더 일반화할 수 있다.

예를 들어 `tripletThresholdScoreBonus`, `sequenceThresholdMultiplierBonus`는 다음과 같은 범용 조건 타입으로 합칠 수 있다.

```json
{
  "effect": {
    "type": "meldTypeThresholdBonus",
    "meldType": "sequence",
    "threshold": 3,
    "bonus": {
      "yakuMultiplierBonus": 0.45
    }
  }
}
```

다만 초기 구현에서는 현재 유물과 1:1로 대응하는 명확한 타입을 먼저 두는 편이 안전하다.

## 검증 스크립트

`scripts/check-relics.mjs`를 추가해 JSON 데이터와 핸들러 연결을 검증한다.

검증 항목:

- `id`가 비어 있지 않다.
- `id`가 중복되지 않는다.
- `name`이 비어 있지 않다.
- `text`가 비어 있지 않다.
- `rarity`가 `relicRarities`에 존재한다.
- `effect.type`이 있으면 `relicEffectHandlers`에 존재한다.
- `playerEffect.type`이 있으면 `relicPlayerEffectHandlers`에 존재한다.
- 효과 타입별 필수 파라미터가 존재한다.

이후 `package.json`의 `check` 스크립트에 연결한다.

```json
{
  "scripts": {
    "check": "node --check src/game.js && ... && node scripts/check-relics.mjs"
  }
}
```

## 구현 순서

1. `src/data/relics.json`을 추가한다.
2. 현재 `relicPool`의 표시 데이터와 효과 파라미터를 JSON으로 옮긴다.
3. `src/game/relic-effects.js`를 추가하고 효과 핸들러를 구현한다.
4. `src/game/relics.js`를 추가하고 JSON 데이터를 기존 런타임 형태로 조립한다.
5. `src/game.js`에서 `relicPool`, `relicRarities` 직접 선언을 제거한다.
6. 기존 유물 선택, 점수 계산, 보상 추첨 로직이 같은 인터페이스로 동작하는지 확인한다.
7. `scripts/check-relics.mjs`를 추가한다.
8. `package.json`의 `check` 스크립트에 유물 검증을 연결한다.
9. `npm run check`와 `npm run build`를 실행해 문법과 번들 결과를 확인한다.

## 주의 사항

JSON import는 현재 Vite 환경에서는 번들링 시 지원된다. 다만 Node에서 직접 검증 스크립트를 실행할 때는 JSON import 방식보다 `fs.readFile`과 `JSON.parse`를 사용하는 편이 호환성이 좋다.

유물 효과 핸들러에서 알 수 없는 타입을 조용히 무시하면 밸런스 버그를 찾기 어렵다. 개발 환경에서는 알 수 없는 `effect.type`이나 `playerEffect.type`을 만나면 명확히 에러를 던지는 편이 좋다.

현재 파일 일부 한글 문자열이 깨져 보이는 상태가 있으므로, 유물 JSON 이전 시에는 실제 UI에서 의도한 한국어 텍스트를 함께 복원하는 작업을 병행하는 것이 좋다.

## 완료 기준

- `src/game.js`에 유물 목록 데이터가 직접 존재하지 않는다.
- 유물 추가와 텍스트 수정은 `src/data/relics.json` 변경만으로 가능하다.
- 기존 게임 로직은 `relicPool` 배열과 `relic.effect(context)`, `relic.player(player)` 인터페이스를 그대로 사용할 수 있다.
- 유효하지 않은 유물 데이터는 검증 스크립트에서 실패한다.
- `npm run check`와 `npm run build`가 통과한다.
