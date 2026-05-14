import { rounds, tutorialRound, scoreHand, tileName, canAct, getAvailableRiichi } from "../../game.js";
import { tileButton } from "./tile.js";
import { renderScore, renderRelic } from "./score.js";
import { renderTutorialGuide } from "./tutorial.js";
import { renderYakuHelp, renderTermsHelp, renderReward, renderEnd, renderTutorialComplete } from "./modal.js";
import { renderTileFace } from "../../tileArt.js";
import { renderMusicControl } from "./audio.js";

export function renderGameView(state, uiState) {
  const isTutorial = state.mode === "tutorial";
  const round = isTutorial ? tutorialRound : rounds[state.roundIndex] ?? rounds[rounds.length - 1];
  const score = scoreHand(
    state.hand,
    state.dora,
    state.relics,
    state.riichi?.active ? { riichi: true, riichiAttemptsUsed: state.riichi.attemptsUsed, discardsLeft: state.discardsLeft } : {},
  );

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
  const riichiState = getAvailableRiichi(state);
  const exchangeDisabled = state.selected.length === 0 || state.discardsLeft === 0 || !canAct(state) || state.riichi?.active;
  const riichiDisabled = !riichiState.canRiichi;
  const submitDisabled = (state.status !== "playing" && state.status !== "tutorial")
    || (state.riichi?.active && state.riichi.phase !== "ready");
  const isTutorial = state.mode === "tutorial";
  const waitTitle = riichiState.waits.length ? ` title="대기패: ${riichiState.waits.map(tileName).join(", ")}"` : "";

  return `
    <section class="table ${state.riichi?.active ? "is-riichi" : ""}">
      <div class="hand" aria-label="손패">
        ${state.hand.map((tile) => tileButton(tile, state.selected, state.riichi)).join("")}
      </div>
      ${renderRiichiTrace(state)}
      <div class="actions">
        <button data-action="exchange" ${exchangeDisabled ? "disabled" : ""}>선택패 교환</button>
        <button data-action="declare-riichi"${waitTitle} ${riichiDisabled ? "disabled" : ""}>리치</button>
        <button data-action="submit" ${submitDisabled ? "disabled" : ""}>조합 제출</button>
        <button class="secondary" data-action="${isTutorial ? "skip-tutorial" : "restart"}">${isTutorial ? "본 게임으로" : "새 게임"}</button>
      </div>
      <p class="message">${state.message}</p>
    </section>
  `;
}

function renderRiichiTrace(state) {
  if (!state.riichi?.active) return "";
  const discarded = state.riichi.lastDiscardedTile;
  const drawn = state.riichi.lastDrawnTile;
  const waits = state.riichi.waits.length ? state.riichi.waits.map(tileName).join(", ") : "";
  return `
    <div class="riichi-trace" aria-live="polite">
      <span>리치 ${formatRiichiPhase(state.riichi.phase)}</span>
      ${discarded ? `<span class="riichi-trace-tile">버림 ${renderTileFace(discarded)}</span>` : ""}
      ${drawn ? `<span class="riichi-trace-tile">신규 ${renderTileFace(drawn)}</span>` : ""}
      ${waits ? `<small>대기 ${waits}</small>` : ""}
    </div>
  `;
}

function formatRiichiPhase(phase) {
  return {
    declared: "선언",
    drawing: "진행",
    ready: "성공",
    failed: "실패",
  }[phase] ?? "";
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
    ${state.status === "startReward" ? renderReward(state.rewardOptions, "시작 유물 선택", "이번 런에서 첫 번째로 사용할 유물을 고르세요.") : ""}
    ${state.status === "reward" ? renderReward(state.rewardOptions, "보상 선택", "라운드를 통과했습니다. 다음 라운드에 가져갈 유물을 하나 고르세요.") : ""}
    ${state.status === "lost" || state.status === "won" ? renderEnd(state.status, state.message) : ""}
    ${renderYakuHelp(uiState.isYakuModalOpen)}
    ${renderTermsHelp(uiState.isTermsModalOpen)}
  `;
}
