# 튜토리얼 코치 오버레이 구현 계획

## 목표

현재 튜토리얼은 별도 안내 패널에서 전체 흐름을 한 번에 보여준다. 이를 실제 게임 화면 위에 단계별 안내를 띄우고, 플레이어가 강조된 UI를 하나씩 직접 눌러 진행하는 방식으로 변경한다.

기존 튜토리얼의 보상 선택, 패 선택, 교환, 제출, 상점 진입, 패 강화, 완료 흐름은 유지한다. 변경의 중심은 튜토리얼 안내 UI와 단계별 타깃 표시다.

## 현재 구조

- `src/ui/render/tutorial.js`
  - `renderTutorialGuide(state, score)`가 현재 단계와 전체 단계를 패널 형태로 출력한다.
- `src/ui/render/game.js`
  - 튜토리얼 중 `renderTutorialGuide`를 게임 화면 상단 영역에 삽입한다.
- `src/ui/render/shop.js`
  - 상점은 모달 형태로 렌더링된다.
  - 튜토리얼 중에는 패 편집을 해야 완료할 수 있도록 일부 흐름이 제한되어 있다.
- `src/ui/events.js`
  - `data-action`, `data-tile`, `data-reward-id`, `data-shop-offer-id` 기반으로 클릭 이벤트를 처리한다.

## 1차 구현 범위

1차 구현은 안정성을 우선한다. DOM 좌표 계산으로 말풍선을 정확히 붙이는 방식 대신, 다음 방식으로 구현한다.

- 실제 눌러야 할 UI에 `data-tutorial-target` 속성과 강조 스타일을 부여한다.
- 화면 하단 또는 우측에 고정형 코치 박스를 띄운다.
- 현재 단계의 대상 UI만 시각적으로 강하게 강조한다.
- 플레이어는 강조된 버튼이나 패를 직접 눌러 다음 단계로 이동한다.

이 방식은 반응형 화면에서 깨질 위험이 적고, 기존 이벤트 처리 흐름을 크게 흔들지 않는다.

## 튜토리얼 단계 정의

튜토리얼 단계 메타데이터를 별도 구조로 정리한다.

예상 단계:

1. 시작 보상 선택
   - 대상: `start-reward`
   - 안내: 첫 라운드에 사용할 시작 보상을 고른다.
2. 버릴 패 선택
   - 대상: `discard-tile`
   - 안내: 완성에 방해되는 패를 선택한다.
3. 패 교환 실행
   - 대상: `exchange-button`
   - 안내: 선택한 패를 교환해 손패를 정리한다.
4. 점수 제출
   - 대상: `submit-button`
   - 안내: 목표 점수를 넘겼다면 제출해 라운드를 클리어한다.
5. 상점에서 패 강화
   - 대상: `upgrade-offer`
   - 안내: 오른쪽 상점 영역에서 3개 후보 중 하나를 강화한다.
6. 상점 종료
   - 대상: `leave-shop`
   - 안내: 상점 행동을 마치고 다음 흐름으로 넘어간다.
7. 튜토리얼 완료
   - 대상: 없음
   - 안내: 완료 모달 또는 완료 화면을 표시한다.

단계 데이터 예시:

```js
{
  id: "selectDiscard",
  target: "discard-tile",
  title: "버릴 패를 선택하세요",
  body: "조합에 맞지 않는 패를 눌러 교환 대상으로 지정합니다.",
  progress: "2/7"
}
```

## 렌더링 변경

### `renderTutorialGuide` 교체

`renderTutorialGuide`를 `renderTutorialCoach`로 교체하거나 내부 구현을 바꾼다.

출력 구성:

- 화면 전체에 깔리는 얕은 오버레이 레이어
- 현재 단계 제목
- 짧은 설명
- 진행도
- 필요 시 보조 문구

버튼 중심 단계에서는 별도의 “다음” 버튼을 두지 않고, 실제 대상 UI 클릭으로 진행한다. 설명만 필요한 단계가 생기면 그때만 “다음” 버튼을 허용한다.

### 게임 화면 삽입 위치

`renderGameView()`에서 기존 패널 삽입 위치를 제거하고, 화면 루트 마지막에 코치 오버레이를 삽입한다.

예상 변경:

```js
${isTutorial ? renderTutorialCoach(state, score) : ""}
```

오버레이는 실제 게임 UI 위에 떠야 하므로, 루트 컨테이너 기준 또는 `position: fixed`로 렌더링한다.

## 타깃 마킹

단계별로 실제 UI에 안정적인 속성을 추가한다.

- 시작 보상 버튼
  - `data-tutorial-target="start-reward"`
- 튜토리얼에서 버리도록 유도하는 패
  - `data-tutorial-target="discard-tile"`
- 교환 버튼
  - `data-tutorial-target="exchange-button"`
- 제출 버튼
  - `data-tutorial-target="submit-button"`
- 상점 오른쪽 강화 후보
  - `data-tutorial-target="upgrade-offer"`
- 상점 나가기 또는 완료 버튼
  - `data-tutorial-target="leave-shop"`

현재 단계와 일치하는 요소에는 `tutorial-target-active` 클래스를 추가한다. 렌더 함수에서 현재 튜토리얼 타깃을 계산해 각 UI에 전달하는 방식이 가장 단순하다.

## 클릭 제한 정책

1차 구현에서는 강한 차단보다 시각적 유도를 우선한다.

- 이미 숨겨져 있는 리치, 깡 등 고급 조작은 계속 숨긴다.
- 현재 단계의 대상 UI를 강하게 강조한다.
- 다른 UI를 눌러도 게임이 망가지지 않는 범위에서는 허용한다.

단, 테스트 중 사용자가 튜토리얼 흐름을 쉽게 깨뜨릴 수 있다고 판단되면 `src/ui/events.js`에 가벼운 가드를 추가한다.

가드 방식:

- 현재 튜토리얼 단계의 허용 액션을 정의한다.
- 허용되지 않은 클릭이면 이벤트를 처리하지 않고 안내 메시지만 갱신한다.
- 예: `selectDiscard` 단계에서는 지정된 패 선택만 허용한다.

## 스타일 계획

추가 CSS:

- `.tutorial-coach-overlay`
  - 화면 위 레이어
  - 게임 조작을 막지 않도록 기본적으로 `pointer-events: none`
- `.tutorial-coach-card`
  - 하단 고정형 안내 박스
  - 높은 대비의 배경과 큰 글자 사용
- `.tutorial-target-active`
  - 밝은 외곽선
  - 약한 발광 효과
  - 짧은 pulse 애니메이션
- `.tutorial-target-active::after`
  - 가능하면 “여기” 같은 작은 배지 표시

상점 화면도 동일한 강조 규칙을 사용한다. 상점은 모달 위에 다시 튜토리얼 코치가 떠야 하므로 z-index 계층을 명확히 둔다.

## 파일별 작업 계획

### `src/ui/render/tutorial.js`

- 기존 전체 목록형 패널을 단계형 코치 UI로 변경한다.
- 현재 단계 계산 로직을 유지하되, 단계별 제목/설명/타깃 정보를 반환하도록 정리한다.
- `renderTutorialCoach(state, score)`를 export한다.

### `src/ui/render/game.js`

- `renderTutorialGuide` import와 호출을 `renderTutorialCoach`로 변경한다.
- 튜토리얼 타깃 정보를 테이블, 보상, 액션 버튼 렌더러에 전달한다.

### `src/ui/render/table.js`

- 튜토리얼에서 선택해야 하는 패에 `data-tutorial-target="discard-tile"`을 추가한다.
- 교환 버튼과 제출 버튼에 단계별 target 속성 및 active class를 붙인다.

### `src/ui/render/reward.js`

- 시작 보상 선택 버튼에 튜토리얼 타깃 속성을 붙일 수 있도록 옵션을 추가한다.

### `src/ui/render/shop.js`

- 오른쪽 패 강화 후보에 `data-tutorial-target="upgrade-offer"`를 추가한다.
- 상점 완료 버튼에 `data-tutorial-target="leave-shop"`를 추가한다.
- 튜토리얼 코치가 상점 모달 위에서도 보이도록 구조와 z-index를 조정한다.

### `src/ui/events.js`

- 1차에서는 기존 클릭 흐름을 최대한 유지한다.
- 필요 시 `isTutorialActionAllowed(state, eventTarget)` 같은 가드 함수를 추가한다.

### 스타일 파일

- 튜토리얼 코치 카드, 오버레이, 강조 대상 스타일을 추가한다.
- 모바일에서도 안내 박스가 손패나 상점 핵심 버튼을 가리지 않도록 하단 여백과 max-width를 조정한다.

## 검증 계획

자동 검증:

- `npm run check`
- `npm run build`

수동 검증:

1. 튜토리얼 시작 시 시작 보상 버튼이 강조되는지 확인한다.
2. 보상을 클릭하면 실제 게임 화면으로 이동하고, 버릴 패가 강조되는지 확인한다.
3. 패를 클릭하면 교환 버튼이 강조되는지 확인한다.
4. 교환 후 제출 버튼이 강조되는지 확인한다.
5. 제출 후 상점 화면에서 오른쪽 강화 후보가 강조되는지 확인한다.
6. 강화 후 상점 종료 버튼이 강조되는지 확인한다.
7. 종료 후 튜토리얼 완료 상태가 정상 표시되는지 확인한다.
8. 데스크톱과 모바일 폭에서 코치 박스가 주요 조작을 심하게 가리지 않는지 확인한다.

## 후속 개선

1차 구현 후 필요하면 다음을 추가한다.

- 실제 DOM 위치를 계산해 말풍선을 대상 UI 옆에 배치
- 대상 UI 외 클릭 차단
- 단계별 작은 화살표 또는 연결선
- 튜토리얼 재시작 버튼
- 이미 완료한 단계 다시 보기

