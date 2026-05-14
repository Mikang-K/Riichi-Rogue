import { renderYakuHelp, renderTermsHelp } from "./modal.js";

export function renderTitleView(uiState) {
  return `
    <section class="shell title-shell">
      <header class="title-hero">
        <p class="eyebrow">Riichi roguelite MVP</p>
        <h1>Riichi Rogue</h1>
        <p>손패 점수, 역 점수, 유물 배수로 목표 점수를 넘기는 리치마작 기반 점수 게임입니다.</p>
      </header>

      <section class="mode-grid">
        <button class="mode-card" data-action="start-tutorial">
          <span>연습 스테이지</span>
          <strong>튜토리얼 시작</strong>
          <small>고정된 패를 한 번 교환해서 화료 흐름을 익힙니다.</small>
        </button>
        <button class="mode-card" data-action="start-main">
          <span>랜덤 런</span>
          <strong>본 게임 시작</strong>
          <small>무작위 손패와 유물 보상으로 목표 점수를 넘깁니다.</small>
        </button>
      </section>
      ${renderYakuHelp(uiState.isYakuModalOpen)}
      ${renderTermsHelp(uiState.isTermsModalOpen)}
    </section>
  `;
}
