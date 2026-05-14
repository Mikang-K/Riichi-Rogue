# Analysis: 코드 리팩토링 (code-refactoring)

**Status**: Complete  
**Created**: 2026-05-14  
**Feature**: code-refactoring  
**Phase**: Check  
**Match Rate**: 100% (G-01 수정 후)

---

## Context Anchor

| 축 | 내용 |
|----|------|
| **WHY** | app.js God Component → 역할별 ES Module 분리로 기능 추가 인지 부담 해소 |
| **WHO** | 솔로 개발자. 리뷰어·기여자 없음. |
| **RISK** | 이벤트 위임 전환 시 버튼 누락; Vite + import.meta.url 이미지 경로; 순환 참조. |
| **SUCCESS** | 전체 게임 플로우 정상 동작 + 모든 파일 150줄 이하 |
| **SCOPE** | app.js UI 레이어 분리 + Vite 도입. game.js 로직 무수정. |

---

## 1. 분석 요약

| 측정 항목 | 수치 | 판정 |
|----------|------|------|
| Structural Match | 100% | ✅ |
| Functional Depth | 100% (수정 후) | ✅ |
| Contract Match | 100% | ✅ |
| **Overall Match Rate** | **100%** | ✅ |
| `vite build` | 51 modules, 0 errors | ✅ |
| 최대 파일 크기 | 102줄 (render/game.js) | ✅ |

---

## 2. 구조적 검증 (Structural Match)

설계 §1.1의 To-Be 파일 구조 대비 구현 현황:

| 파일 | 존재 | 설계 의도 충족 |
|------|------|--------------|
| `src/game.js` (canAct export) | ✅ | canAct export 확인 |
| `src/tileArt.js` | ✅ | 무수정 유지 |
| `src/data/yaku-reference.js` | ✅ | 11개 항목 이동 |
| `src/data/term-reference.js` | ✅ | 12개 항목 이동 |
| `src/ui/ui-state.js` | ✅ | getUiState/setUiState |
| `src/ui/events.js` | ✅ | 단일 위임 리스너 |
| `src/ui/render/tile.js` | ✅ | selectedIds 파라미터 수신 |
| `src/ui/render/score.js` | ✅ | 4개 함수 모두 존재 |
| `src/ui/render/modal.js` | ✅ | 5개 함수 모두 존재 |
| `src/ui/render/tutorial.js` | ✅ | |
| `src/ui/render/game.js` | ✅ | 5개 private 함수 분리 |
| `src/ui/render/title.js` | ✅ | |
| `src/app.js` | ✅ | 21줄 (목표 ~40줄보다 간결) |
| `vite.config.js` | ✅ | |

---

## 3. 기능 검증 (Functional Depth)

### 3.1 이벤트 위임 체크리스트 (설계 §5)

| data-action | 핸들러 | 판정 |
|-------------|--------|------|
| `exchange` | exchangeSelected | ✅ |
| `submit` | submitHand | ✅ |
| `restart` | newRun | ✅ |
| `start-main` | newRun | ✅ |
| `skip-tutorial` | newRun | ✅ |
| `start-tutorial` | newTutorial | ✅ |
| `open-yaku` | setUiState | ✅ |
| `close-yaku` | setUiState | ✅ |
| `open-terms` | setUiState | ✅ |
| `close-terms` | setUiState | ✅ |
| `data-tile` | toggleTile | ✅ |
| `data-relic` | chooseRelic | ✅ |

### 3.2 의존성 단방향 규칙

`game.js`가 UI 모듈을 import하지 않는 규칙: ✅

---

## 4. 갭 목록

| ID | 심각도 | 파일 | 내용 | 상태 |
|----|--------|------|------|------|
| G-01 | Low | `render/game.js:44` | `renderStatusGrid`가 `round`를 독립 재계산 — 중복 연산 | ✅ 수정완료 |
| G-02 | Info | `events.js` imports | 설계 의사코드의 `newTitle`, `canAct` import 없음 — 올바른 생략 | 수정 불필요 |

---

## 5. 플랜 성공 기준 달성 현황

| 기준 | 상태 | 근거 |
|------|------|------|
| `npm run dev` → 게임 정상 로드 | ✅ | localhost:5173 서버 기동 확인 |
| 타이틀 → 튜토리얼 → 본게임 전환 | ⚠️ | 브라우저 직접 테스트 필요 |
| 라운드 통과 → 유물 선택 → 엔딩 | ⚠️ | 브라우저 직접 테스트 필요 |
| 역 목록 / 용어 설명 모달 | ⚠️ | 브라우저 직접 테스트 필요 |
| 모든 소스 파일 150줄 이하 | ✅ | 최대 102줄 (render/game.js) |
| `npm run build` 오류 없음 | ✅ | 51 modules, 0 errors |

> ⚠️ 항목은 `http://localhost:5173`에서 수동 플레이로 확인 필요.

---

## 6. 결론

정적 분석 기준 Match Rate **100%** 달성. 설계 명세의 모든 파일·함수·이벤트 핸들러가 구현에 반영됨.
G-01 마이너 이슈(중복 연산)는 수정 완료. 브라우저 플로우 검증만 남아 있음.
