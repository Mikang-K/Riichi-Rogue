import { rounds, tutorialRound, scoreHand, tileName, canAct } from "../../game.js";
import { tileButton } from "./tile.js";
import { renderScore, renderRelic } from "./score.js";
import { renderTutorialGuide } from "./tutorial.js";
import { renderYakuHelp, renderTermsHelp, renderReward, renderEnd, renderTutorialComplete } from "./modal.js";
import { renderTileFace } from "../../tileArt.js";
import { renderMusicControl } from "./audio.js";

export function renderGameView(state, uiState) {
  const isTutorial = state.mode === "tutorial";
  const round = isTutorial ? tutorialRound : rounds[state.roundIndex] ?? rounds[rounds.length - 1];
  const score = scoreHand(state.hand, state.dora, state.relics);

  return `
    <section class="shell">
      ${renderTopbar(round, score, isTutorial)}
      ${renderStatusGrid(state, round)}
      ${isTutorial ? renderTutorialGuide(state, score) : ""}
      ${renderTable(state, score)}
      ${renderInfoGrid(state, score)}
      ${renderOverlays(state, score, uiState)}
      ${renderMusicControl(uiState.isMusicMuted)}
    </section>
  `;
}

function renderTopbar(round, score, isTutorial) {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">${isTutorial ? "Practice stage" : "Riichi roguelite MVP"}</p>
        <h1>Riichi Rogue</h1>
      </div>
      <div class="scorebox">
        <span>목표</span>
        <strong>${round.targetScore}점</strong>
      </div>
      <div class="scorebox accent">
        <span>현재</span>
        <strong>${score.totalScore}점</strong>
      </div>
    </header>
  `;
}

function renderStatusGrid(state, round) {
  return `
    <section class="status-grid">
      <article class="panel compact">
        <span class="label">라운드</span>
        <strong>${round.name}</strong>
      </article>
      <article class="panel compact">
        <span class="label">교환</span>
        <strong>${state.discardsLeft}/${state.maxDiscards}회</strong>
      </article>
      <article class="panel compact">
        <span class="label">도라</span>
        <strong class="dora-tile" title="${tileName(state.dora)}">${renderTileFace(state.dora)}</strong>
      </article>
      <article class="panel compact">
        <span class="label">획득 점수</span>
        <strong>${state.coins}</strong>
      </article>
    </section>
  `;
}

function renderTable(state, score) {
  const exchangeDisabled = state.selected.length === 0 || state.discardsLeft === 0 || !canAct(state);
  const submitDisabled = state.status !== "playing" && state.status !== "tutorial";
  const isTutorial = state.mode === "tutorial";

  return `
    <section class="table">
      <div class="hand" aria-label="손패">
        ${state.hand.map((tile) => tileButton(tile, state.selected)).join("")}
      </div>
      <div class="actions">
        <button data-action="exchange" ${exchangeDisabled ? "disabled" : ""}>선택패 교환</button>
        <button data-action="submit" ${submitDisabled ? "disabled" : ""}>조합 제출</button>
        <button data-action="${isTutorial ? "skip-tutorial" : "restart"}">${isTutorial ? "본 게임으로" : "새 게임"}</button>
      </div>
      <p class="message">${state.message}</p>
    </section>
  `;
}

function renderInfoGrid(state, score) {
  return `
    <section class="info-grid">
      <article class="panel">
        <h2>판정</h2>
        ${renderScore(score)}
      </article>
      <article class="panel">
        <h2>유물</h2>
        <div class="relics">${state.relics.map(renderRelic).join("")}</div>
      </article>
    </section>
  `;
}

function renderOverlays(state, score, uiState) {
  return `
    ${state.status === "tutorialComplete" ? renderTutorialComplete(score) : ""}
    ${state.status === "reward" ? renderReward(state.rewardOptions) : ""}
    ${state.status === "lost" || state.status === "won" ? renderEnd(state.status, state.message) : ""}
    ${renderYakuHelp(uiState.isYakuModalOpen)}
    ${renderTermsHelp(uiState.isTermsModalOpen)}
  `;
}
