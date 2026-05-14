# Design: 코드 리팩토링 (code-refactoring)

**Status**: Draft  
**Created**: 2026-05-14  
**Feature**: code-refactoring  
**Phase**: Design  
**Selected Architecture**: Option B — 완전 분리 (Clean)

---

## Context Anchor

| 축 | 내용 |
|----|------|
| **WHY** | app.js 단일 파일의 God Component 구조가 새 기능 추가 시 인지 부담을 가중. 역할별 모듈 분리로 해소. |
| **WHO** | 솔로 개발자. 리뷰어·기여자 없음. |
| **RISK** | 이벤트 위임 전환 시 특정 버튼 누락; Vite + import.meta.url 이미지 경로 이슈; 모듈 순환 참조. |
| **SUCCESS** | 타이틀 → 튜토리얼 → 본게임 → 보상 → 엔딩 전체 플로우 정상 동작, 모든 파일 150줄 이하. |
| **SCOPE** | app.js UI 레이어 분리 + Vite 도입. game.js 로직 무수정. 이미지 자산 추가 없음. |

---

## 1. 아키텍처 개요

선택된 Option B는 `src/` 루트 아래 `data/`, `ui/`, `ui/render/` 세 단계 폴더 구조로 관심사를 완전히 분리한다.

### 1.1 To-Be 파일 구조

```
src/
  game.js                     (기존 유지 — canAct export 추가만)
  tileArt.js                  (기존 유지 — 무수정)
  data/
    yaku-reference.js          (역 목록 정적 데이터)
    term-reference.js          (용어 설명 정적 데이터)
  ui/
    ui-state.js                (모달 열림/닫힘 UI 전용 상태)
    events.js                  (이벤트 위임 핸들러)
    render/
      tile.js                  (tileButton)
      score.js                 (renderScore, renderRelicBonus, renderRelic, formatMultiplier)
      modal.js                 (renderYakuHelp, renderTermsHelp, renderReward, renderEnd, renderTutorialComplete)
      tutorial.js              (renderTutorialGuide)
      game.js                  (renderGameView — 게임 화면 조합)
      title.js                 (renderTitleView — 타이틀 화면)
  app.js                      (진입점 ~40줄: 초기화 + render loop)
index.html                    (무수정)
vite.config.js                (신규)
package.json                  (scripts 갱신)
```

### 1.2 의존성 그래프 (단방향)

```
game.js ──────────────────────────────────────────┐
tileArt.js ──────────┐                            │
                     ↓                            ↓
data/yaku-reference.js ──→ ui/render/modal.js     │
data/term-reference.js ──→ ui/render/modal.js     │
                          ui/render/tile.js ←─────┤
                          ui/render/score.js ←────┤
                          ui/render/tutorial.js ←─┤
                          ui/render/game.js ←─────┤ (game.js 함수 사용)
                          ui/render/title.js ←────┤
ui/ui-state.js ───────→ ui/render/game.js         │
                      → ui/render/title.js        │
                      → ui/events.js              │
ui/events.js ─────────→ app.js                    │
                                                  │
app.js (진입점) ←─────────────────────────────────┘
```

**규칙**: 화살표 방향으로만 import. `game.js`는 어떤 UI 모듈도 import하지 않는다.

---

## 2. 모듈 상세 설계

### 2.1 game.js — canAct export 추가

```js
// 변경 전: function canAct(state) { ... }
// 변경 후:
export function canAct(state) {
  return state.status === "playing" || state.status === "tutorial";
}
```

기존 private `canAct`를 export로 전환. `app.js`의 중복 `canAct()` 제거.

---

### 2.2 src/data/yaku-reference.js

```js
export const yakuReference = [
  { name: "리치", han: "1판", text: "...", example: "..." },
  // ...
];
```

`app.js`에 있던 `yakuReference` 배열을 그대로 이동. 12개 항목.

---

### 2.3 src/data/term-reference.js

```js
export const termReference = [
  { name: "손패", text: "..." },
  // ...
];
```

`app.js`에 있던 `termReference` 배열을 그대로 이동. 12개 항목.

---

### 2.4 src/ui/ui-state.js

UI 전용 전역 상태 (모달 열림/닫힘). game state와 분리.

```js
let isYakuModalOpen = false;
let isTermsModalOpen = false;

export function getUiState() {
  return { isYakuModalOpen, isTermsModalOpen };
}

export function setUiState(updates) {
  if (updates.isYakuModalOpen !== undefined) isYakuModalOpen = updates.isYakuModalOpen;
  if (updates.isTermsModalOpen !== undefined) isTermsModalOpen = updates.isTermsModalOpen;
}
```

---

### 2.5 src/ui/render/tile.js

```js
import { tileName } from "../../game.js";
import { renderTileFace } from "../../tileArt.js";

export function tileButton(tile, selectedIds) {
  const selected = selectedIds.includes(tile.copyId);
  const classes = ["tile", tile.suit === "z" ? "honor" : tile.suit, selected ? "selected" : ""].join(" ");
  return `<button class="${classes}" data-tile="${tile.copyId}" aria-label="${tileName(tile)}" aria-pressed="${selected}" title="${tileName(tile)}">${renderTileFace(tile)}</button>`;
}
```

**변경점**: 전역 `state` 참조 제거 → `selectedIds` 파라미터로 수신.

---

### 2.6 src/ui/render/score.js

```js
export function renderScore(score) { /* ... */ }
export function renderRelicBonus(item) { /* ... */ }
export function renderRelic(relic) { /* ... */ }
export function formatMultiplier(value) { /* ... */ }
```

`app.js`의 `renderScore`, `renderRelicBonus`, `renderRelic`, `formatMultiplier`를 이동.  
모두 `score` 객체를 파라미터로 받아 처리 (전역 상태 참조 없음).

---

### 2.7 src/ui/render/modal.js

```js
import { yakuReference } from "../../data/yaku-reference.js";
import { termReference } from "../../data/term-reference.js";

export function renderYakuHelp(isOpen) { /* ... */ }
export function renderTermsHelp(isOpen) { /* ... */ }
export function renderReward(rewardOptions) { /* ... */ }
export function renderEnd(status, message) { /* ... */ }
export function renderTutorialComplete(score) { /* ... */ }
```

모든 모달 렌더 함수. 각각 필요한 데이터만 파라미터로 수신.

---

### 2.8 src/ui/render/tutorial.js

```js
export function renderTutorialGuide(state, score) { /* ... */ }
```

튜토리얼 단계 가이드 패널. `state.discardsLeft`, `score.isComplete`, `state.status`를 사용.

---

### 2.9 src/ui/render/game.js

게임 화면 최상위 조합 함수.

```js
import { rounds, tutorialRound, scoreHand, tileName } from "../../game.js";
import { tileButton } from "./tile.js";
import { renderScore } from "./score.js";
import { renderTutorialGuide } from "./tutorial.js";
import { renderYakuHelp, renderTermsHelp, renderReward, renderEnd, renderTutorialComplete } from "./modal.js";
import { renderTileFace } from "../../tileArt.js";

export function renderGameView(state, uiState) {
  const isTutorial = state.mode === "tutorial";
  const round = isTutorial ? tutorialRound : rounds[state.roundIndex] ?? rounds[rounds.length - 1];
  const score = scoreHand(state.hand, state.dora, state.relics);

  return `
    <section class="shell">
      ${renderTopbar(round, score)}
      ${renderStatusGrid(state, score)}
      ${isTutorial ? renderTutorialGuide(state, score) : ""}
      ${renderTable(state, score)}
      ${renderInfoGrid(state, score)}
      ${renderOverlays(state, score, uiState)}
    </section>
  `;
}
```

`renderTopbar`, `renderStatusGrid`, `renderTable`, `renderInfoGrid`, `renderOverlays`는 파일 내 private 함수.

---

### 2.10 src/ui/render/title.js

```js
import { renderYakuHelp, renderTermsHelp } from "./modal.js";

export function renderTitleView(uiState) {
  return `
    <section class="shell title-shell">
      ${renderTitleHero()}
      ${renderModeGrid()}
      ${renderYakuHelp(uiState.isYakuModalOpen)}
      ${renderTermsHelp(uiState.isTermsModalOpen)}
    </section>
  `;
}
```

---

### 2.11 src/ui/events.js

이벤트 위임: `#app`에 단일 `click` 리스너를 앱 시작 시 한 번만 등록.

```js
import {
  toggleTile, exchangeSelected, submitHand,
  newRun, newTitle, newTutorial, chooseRelic, canAct,
} from "../game.js";

export function initEvents({ getState, setState, getUiState, setUiState, rerender }) {
  document.querySelector("#app").addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    const tileId = e.target.closest("[data-tile]")?.dataset.tile;
    const relicId = e.target.closest("[data-relic]")?.dataset.relic;

    let nextState = getState();

    if (tileId) {
      nextState = toggleTile(nextState, tileId);
    } else if (relicId) {
      nextState = chooseRelic(nextState, relicId);
    } else {
      switch (action) {
        case "exchange":      nextState = exchangeSelected(nextState); break;
        case "submit":        nextState = submitHand(nextState); break;
        case "restart":       nextState = newRun(); break;
        case "start-main":
        case "skip-tutorial": nextState = newRun(); break;
        case "start-tutorial":nextState = newTutorial(); break;
        case "open-yaku":     setUiState({ isYakuModalOpen: true }); rerender(); return;
        case "close-yaku":    setUiState({ isYakuModalOpen: false }); rerender(); return;
        case "open-terms":    setUiState({ isTermsModalOpen: true }); rerender(); return;
        case "close-terms":   setUiState({ isTermsModalOpen: false }); rerender(); return;
        default: return;
      }
    }

    setState(nextState);
    rerender();
  });
}
```

**변경점**: 모달 상태 변경은 `setUiState` 후 즉시 return (setState 호출 불필요).

---

### 2.12 src/app.js (진입점)

```js
import { newTitle } from "./game.js";
import { getUiState, setUiState } from "./ui/ui-state.js";
import { renderGameView } from "./ui/render/game.js";
import { renderTitleView } from "./ui/render/title.js";
import { initEvents } from "./ui/events.js";

const app = document.querySelector("#app");
let state = newTitle();

function render() {
  const uiState = getUiState();
  app.innerHTML = state.mode === "title"
    ? renderTitleView(uiState)
    : renderGameView(state, uiState);
}

initEvents({
  getState: () => state,
  setState: (s) => { state = s; },
  getUiState,
  setUiState,
  rerender: render,
});

render();
```

---

### 2.13 vite.config.js

```js
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: false,
});
```

> `tileArt.js`의 `new URL('./source/...', import.meta.url)` 패턴은 Vite에서 정적 자산 URL로 그대로 동작한다 (Vite 공식 지원).

---

### 2.14 package.json scripts 갱신

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "node --check src/game.js"
  },
  "devDependencies": {
    "vite": "^6.x"
  }
}
```

---

## 3. 렌더링 사이클 비교

### Before (app.js 방식)

```
사용자 클릭
  → 특정 버튼에 붙은 이벤트 리스너 실행
  → state 변경
  → app.innerHTML = ... (전체 교체)
  → bindEvents() 재호출 (이벤트 리스너 재등록)
```

### After (이벤트 위임 방식)

```
사용자 클릭
  → #app의 단일 이벤트 리스너 실행 (위임, 앱 생애주기 동안 1회 등록)
  → state / uiState 변경
  → app.innerHTML = ... (전체 교체)
  (이벤트 재등록 없음)
```

---

## 4. 데이터 흐름

```
[game.js] 순수 함수 →  state 객체
[ui-state.js] 모달 상태 →  uiState 객체
[app.js] state + uiState → render() → innerHTML
[events.js] 클릭 → game.js 함수 호출 → setState → rerender()
```

---

## 5. 마이그레이션 검증 체크리스트

이벤트 위임으로 전환 시 누락되면 안 되는 `data-action` 목록:

| action | 설명 |
|--------|------|
| `exchange` | 선택패 교환 |
| `submit` | 조합 제출 |
| `restart` | 새 게임 |
| `start-main` | 본 게임 시작 (타이틀/튜토리얼 완료) |
| `skip-tutorial` | 튜토리얼 스킵 |
| `start-tutorial` | 튜토리얼 시작 |
| `open-yaku` | 역 목록 열기 |
| `close-yaku` | 역 목록 닫기 |
| `open-terms` | 용어 설명 열기 |
| `close-terms` | 용어 설명 닫기 |

`data-tile` / `data-relic` 위임도 events.js에서 처리.

---

## 6. 리스크 및 대응

| 위험 | 대응 |
|------|------|
| Vite + `import.meta.url` 이미지 경로 깨짐 | 구현 후 브라우저에서 이미지 로딩 직접 확인. 실패 시 `publicDir` + `/source/` 절대경로로 전환. |
| 이벤트 위임 특정 버튼 누락 | §5 체크리스트 기준으로 전체 버튼 수동 클릭 테스트. |
| 모듈 순환 참조 | 의존성 그래프(§1.2) 방향만 import. `game.js`는 UI import 금지. |
| render/game.js 파일 크기 초과 | renderTopbar/StatusGrid/Table/InfoGrid를 파일 내 private 함수로 분리해 150줄 이내 유지. |

---

## 7. 성공 기준

플랜 문서 성공 기준과 동일:
- [ ] `npm run dev` → 게임 정상 로드
- [ ] 타이틀 → 튜토리얼 → 패 교환 → 제출 → 본게임 전환
- [ ] 본게임 라운드 통과 → 유물 선택 → 다음 라운드, 패배/승리 엔딩
- [ ] 역 목록 / 용어 설명 모달 열기·닫기
- [ ] 모든 소스 파일 150줄 이하
- [ ] `npm run build` 오류 없음

---

## 8. 구현 가이드

### 8.1 모듈 맵

| 모듈 ID | 파일 | 의존 |
|---------|------|------|
| M1 | `vite.config.js`, `package.json` | 없음 |
| M2 | `src/game.js` (canAct export) | 없음 |
| M3 | `src/data/yaku-reference.js`, `src/data/term-reference.js` | 없음 |
| M4 | `src/ui/ui-state.js` | 없음 |
| M5 | `src/ui/render/tile.js` | M2, tileArt.js |
| M6 | `src/ui/render/score.js` | 없음 |
| M7 | `src/ui/render/modal.js` | M3 |
| M8 | `src/ui/render/tutorial.js` | 없음 |
| M9 | `src/ui/render/game.js` | M2, M5, M6, M7, M8 |
| M10 | `src/ui/render/title.js` | M7 |
| M11 | `src/ui/events.js` | M2, M4 |
| M12 | `src/app.js` | M2, M4, M9, M10, M11 |

### 8.2 권장 세션 분할

| 세션 | 모듈 | 작업 |
|------|------|------|
| Session 1 | M1, M2, M3 | Vite 설치 + canAct export + 데이터 파일 분리 |
| Session 2 | M4, M5, M6 | ui-state + tile/score 렌더 분리 |
| Session 3 | M7, M8 | modal + tutorial 렌더 분리 |
| Session 4 | M9, M10 | game/title 최상위 렌더 조합 |
| Session 5 | M11, M12 | events 위임 + app.js 진입점 정리 + 검증 |

### 8.3 Session Guide (--scope 지원)

```
/pdca do code-refactoring --scope M1,M2,M3   # Session 1
/pdca do code-refactoring --scope M4,M5,M6   # Session 2
/pdca do code-refactoring --scope M7,M8      # Session 3
/pdca do code-refactoring --scope M9,M10     # Session 4
/pdca do code-refactoring --scope M11,M12    # Session 5
```
