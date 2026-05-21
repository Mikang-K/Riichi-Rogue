import { renderYakuHelp, renderTermsHelp } from "./modal.js";
import { renderMusicControl } from "./audio.js";
import { renderTermText } from "./terms.js";

export function renderTitleView(uiState) {
  return `
    <section class="shell title-shell">
      <header class="title-hero">
        <p class="eyebrow">${renderTermText("리치 로그라이트")}</p>
        <h1>리치 로그</h1>
        <p>${renderTermText("손패 점수, 역 점수, 도라, 유물과 증강을 조합해 목표 점수를 넘기는 마작 기반 점수 게임입니다.")}</p>
      </header>

      <section class="mode-grid">
        <button class="mode-card" data-action="start-tutorial">
          <span>연습</span>
          <strong>튜토리얼 시작</strong>
          <small>${renderTermText("고정된 손패로 교환과 제출 흐름을 익힙니다.")}</small>
        </button>
        <button class="mode-card" data-action="start-main">
          <span>본 게임</span>
          <strong>새 런 시작</strong>
          <small>${renderTermText("무작위 손패, 제한된 교환, 유물과 상점으로 목표 점수를 넘깁니다.")}</small>
        </button>
      </section>
      ${renderYakuHelp(uiState.isYakuModalOpen)}
      ${renderTermsHelp(uiState.isTermsModalOpen)}
      ${renderMusicControl(uiState.isMusicMuted)}
    </section>
  `;
}
