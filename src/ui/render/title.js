import { renderYakuHelp, renderTermsHelp } from "./modal.js";
import { renderMusicControl } from "./audio.js";
import { renderTermText } from "./terms.js";

export function renderTitleView(uiState, options = {}) {
  const savedRun = options.savedRun;
  const stats = options.stats;
  return `
    <section class="shell title-shell">
      <header class="title-hero">
        <p class="eyebrow">${renderTermText("리치 로그라이트")}</p>
        <h1>리치 로그</h1>
        <p>${renderTermText("손패 점수, 역 점수, 도라, 유물과 증강을 조합해 목표 점수를 넘기는 마작 기반 점수 게임입니다.")}</p>
      </header>

      <section class="mode-grid">
        ${savedRun ? `
          <button class="mode-card mode-card-resume" data-action="resume-run">
            <span>이어하기</span>
            <strong>저장된 런 계속</strong>
            <small>${renderTermText(formatSavedRun(savedRun))}</small>
          </button>
        ` : ""}
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
      ${stats ? renderStatsSummary(stats) : ""}
      ${renderYakuHelp(uiState.isYakuModalOpen)}
      ${renderTermsHelp(uiState.isTermsModalOpen)}
      ${renderMusicControl(uiState.isMusicMuted)}
    </section>
  `;
}

function formatSavedRun(savedRun) {
  const state = savedRun.state;
  const round = (state.roundIndex ?? 0) + 1;
  const status = {
    startReward: "시작 보상 선택 중",
    playing: "라운드 진행 중",
    shop: "상점",
    lost: "게임 오버",
    won: "완주 성공",
  }[state.status] ?? state.status;
  return `${round}번째 라운드, ${status}. 저장 시각: ${new Date(savedRun.savedAt).toLocaleString()}`;
}

function renderStatsSummary(stats) {
  return `
    <section class="panel title-stats">
      <span class="label">전적</span>
      <div class="title-stats-grid">
        <strong>런 ${stats.totalRuns}</strong>
        <strong>완주 ${stats.wins}</strong>
        <strong>최고 ${stats.bestScore}점</strong>
        <strong>최고 ${stats.bestRound}라운드</strong>
      </div>
    </section>
  `;
}
