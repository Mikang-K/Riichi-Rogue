# Plan: 코드 리팩토링 (code-refactoring)

**Status**: Draft  
**Created**: 2026-05-14  
**Feature**: code-refactoring  
**Phase**: Plan

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | `app.js` 단일 파일이 상태·렌더링·이벤트·정적 데이터를 모두 담당하는 God Component 구조로, 기능 추가 시 유지보수 비용이 급증하고 있다. |
| **Solution** | 역할별 ES Module 분리 + Vite 빌드 도구 도입으로 관심사를 분리하고 이벤트 위임 패턴으로 렌더링 사이클 효율화. |
| **UX 효과** | 사용자에게 직접적인 UX 변화는 없으나, 향후 기능 추가 사이클이 단축되고 버그 발생 빈도가 낮아진다. |
| **핵심 가치** | 기술 부채 청산과 개발 속도 개선. 게임 로직은 그대로 유지하므로 기능 회귀 위험이 낮다. |

---

## Context Anchor

| 축 | 내용 |
|----|------|
| **WHY** | 게임 로직은 견고하지만 UI 레이어가 단일 파일에 집중되어 있어, 새 기능(역 추가, 유물 확장)을 추가할 때마다 `app.js` 전체를 파악해야 하는 인지 부담이 크다. |
| **WHO** | 혼자 개발하는 솔로 개발자. 리뷰어 없음, 기여자 없음. |
| **RISK** | 기존 동작하는 코드를 쪼개는 과정에서 이벤트 누락·모듈 순환 참조·Vite 경로 설정 실수 가능성. |
| **SUCCESS** | 리팩토링 후 게임 전체 플로우(타이틀 → 튜토리얼 → 본게임 → 보상 → 엔딩)가 브라우저에서 정상 동작. |
| **SCOPE** | `app.js` 모듈 분리 + Vite 도입. `game.js`·`tileArt.js` 로직 무수정. 이미지 자산 추가 없음. |

---

## 1. 현황 분석

### 1.1 파일 구조

```
src/
  game.js      (515줄) — 게임 순수 로직, 잘 설계됨
  app.js       (431줄) — God Component (문제 영역)
  tileArt.js   (55줄)  — 이미지 매핑, 양호
index.html
package.json
scripts/serve.mjs
```

### 1.2 app.js 내부 책임 분석

| 책임 | 줄 수 | 비고 |
|------|-------|------|
| 전역 UI 상태 (`isYakuModalOpen`, `isTermsModalOpen`) | ~5줄 | game state와 분리 필요 |
| 정적 참조 데이터 (`yakuReference`, `termReference`) | ~50줄 | 별도 data 모듈로 이동 |
| 최상위 렌더 함수 (`render`, `renderTitle`) | ~110줄 | 분리 가능 |
| 세부 렌더 함수 (score, relic, modal 등) | ~180줄 | 각 render 모듈로 분리 |
| 이벤트 바인딩 (`bindEvents`) | ~80줄 | 위임 방식으로 전환 |

### 1.3 주요 문제점

1. **중복 canAct()** — `game.js`의 private `canAct()`와 `app.js`의 `canAct()`가 동일 로직 중복
2. **매 렌더마다 이벤트 재등록** — `app.innerHTML` 교체 후 `bindEvents()` 재호출로 이벤트 리스너가 누적될 위험
3. **정적 데이터와 UI 로직 혼재** — `yakuReference`/`termReference`가 렌더 함수 사이에 삽입
4. **단일 파일 렌더 함수** — 어떤 UI 컴포넌트를 수정하려면 431줄 파일을 탐색해야 함

---

## 2. 목표

### 2.1 기능 요구사항

| ID | 항목 | 설명 |
|----|------|------|
| F-01 | Vite 빌드 도구 도입 | `vite` 설치, `vite.config.js` 작성, `package.json` scripts 갱신 |
| F-02 | 정적 데이터 분리 | `src/data/yaku-reference.js`, `src/data/term-reference.js` 생성 |
| F-03 | UI 상태 모듈 분리 | `src/ui/ui-state.js` — `isYakuModalOpen`, `isTermsModalOpen` |
| F-04 | 렌더 함수 모듈 분리 | `src/ui/render/` 디렉토리에 역할별 파일로 분리 |
| F-05 | 이벤트 위임 패턴 적용 | `src/ui/events.js` — `#app`에 단일 클릭 리스너 |
| F-06 | 중복 canAct() 제거 | `game.js`의 `canAct()`를 export하고 `app.js` 버전 삭제 |
| F-07 | 진입점 정리 | `src/app.js` 를 초기화·루프 진입점으로만 유지 (~30줄 이하) |

### 2.2 비기능 요구사항

| ID | 항목 | 기준 |
|----|------|------|
| N-01 | 기능 회귀 없음 | 타이틀 → 튜토리얼 → 본게임 → 보상 → 엔딩 플로우 모두 정상 동작 |
| N-02 | 빌드 성공 | `vite build` 오류 없음 |
| N-03 | 개발 서버 | `vite dev` 로 `localhost:5173` 정상 서빙 |
| N-04 | 파일당 줄 수 | 어떤 단일 파일도 150줄을 초과하지 않음 |

---

## 3. 대상 파일 구조 (To-Be)

```
src/
  game.js                    (변경 없음 — canAct export 추가만)
  tileArt.js                 (변경 없음)
  data/
    yaku-reference.js        (역 목록 정적 데이터)
    term-reference.js        (용어 설명 정적 데이터)
  ui/
    ui-state.js              (모달 열림/닫힘 전역 상태)
    events.js                (이벤트 위임 핸들러)
    render/
      title.js               (renderTitle)
      game.js                (최상위 renderGame)
      score.js               (renderScore, renderRelicBonus)
      tutorial.js            (renderTutorialGuide)
      tile.js                (tileButton)
      modal.js               (renderYakuHelp, renderTermsHelp, renderReward,
                              renderEnd, renderTutorialComplete)
  app.js                     (진입점 — 초기화 + 루프만)
index.html
vite.config.js               (신규)
package.json                 (scripts 갱신)
```

---

## 4. 구현 상세

### 4.1 Vite 도입 (F-01)

```bash
npm install --save-dev vite
```

`vite.config.js`:
```js
import { defineConfig } from "vite";
export default defineConfig({ root: ".", publicDir: "src/source" });
```

`package.json` scripts 갱신:
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

> **주의**: `tileArt.js`의 `new URL('./source/...', import.meta.url)` 패턴은 Vite에서 정적 자산 URL로 그대로 동작함.

### 4.2 game.js canAct export (F-06)

`game.js` 하단의 private `canAct`를 export:
```js
export function canAct(state) { ... }
```
`app.js`의 중복 `canAct()` 함수 삭제.

### 4.3 이벤트 위임 (F-05)

기존: 매 render 후 `bindEvents()` 호출 → 다수의 리스너 누적 위험  
변경: `#app`에 단일 `click` 이벤트 리스너를 앱 시작 시 한 번만 등록

```js
// src/ui/events.js
export function initEvents(getState, setState, rerender) {
  document.querySelector("#app").addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    const tile = e.target.closest("[data-tile]")?.dataset.tile;
    const relic = e.target.closest("[data-relic]")?.dataset.relic;
    // dispatch 처리
  });
}
```

---

## 5. 리스크

| 위험 | 가능성 | 대응 |
|------|--------|------|
| Vite + `import.meta.url` 이미지 경로 깨짐 | 중간 | Vite 빌드 후 브라우저에서 이미지 로딩 직접 확인 |
| 이벤트 위임 전환 시 특정 버튼 누락 | 중간 | 버튼별 `data-action` 목록 체크리스트로 검증 |
| 모듈 순환 참조 | 낮음 | 단방향 의존성 구조 유지 (`game.js` ← `ui/*` ← `app.js`) |
| tileArt.js import.meta.url Vite 호환성 | 낮음 | Vite는 이 패턴을 공식 지원 |

---

## 6. 성공 기준

- [ ] `npm run dev` 실행 시 게임이 브라우저에서 정상 로드
- [ ] 타이틀 화면 → 튜토리얼 → 패 교환 → 조합 제출 → 튜토리얼 완료 → 본게임 전환
- [ ] 본게임: 라운드 통과 → 유물 선택 → 다음 라운드, 패배/승리 엔딩 모달
- [ ] 역 목록 모달 열기/닫기 정상
- [ ] 용어 설명 모달 열기/닫기 정상
- [ ] 어떤 단일 소스 파일도 150줄 초과 없음
- [ ] `npm run build` 오류 없음

---

## 7. 구현 순서

1. Vite 설치 및 `vite.config.js` 작성
2. `game.js`에서 `canAct` export
3. `src/data/` 데이터 파일 분리
4. `src/ui/ui-state.js` 생성
5. `src/ui/render/` 각 파일 분리 (tile → score → modal → tutorial → game → title)
6. `src/ui/events.js` 이벤트 위임 구현
7. `src/app.js` 진입점으로 정리
8. 브라우저 전체 플로우 검증
