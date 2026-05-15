import {
  rounds,
  tutorialRound,
  scoreHand,
  tileName,
  canAct,
  getAvailableRiichi,
  getAvailableKans,
  getVisibleDoraIndicators,
  getVisibleUraDoraIndicators,
  getScoringTiles,
} from "../../game.js";
import { tileButton } from "./tile.js";
import { renderAugment, renderScore, renderRelic } from "./score.js";
import { renderTutorialGuide } from "./tutorial.js";
import { renderYakuHelp, renderTermsHelp, renderReward, renderEnd, renderTutorialComplete } from "./modal.js";
import { renderTileFace } from "../../tileArt.js";
import { renderMusicControl } from "./audio.js";

export function renderGameView(state, uiState) {
  const isTutorial = state.mode === "tutorial";
  const round = isTutorial ? tutorialRound : rounds[state.roundIndex] ?? rounds[rounds.length - 1];
  const score = scoreHand(
    getScoringTiles(state),
    state.doraState ?? state.dora,
    state.relics,
    state.riichi?.active
      ? {
        riichi: true,
        includeUraDora: state.riichi.phase === "ready",
        riichiAttemptsUsed: state.riichi.attemptsUsed,
        discardsLeft: state.discardsLeft,
        rinshan: state.kan?.rinshanReady === true,
        kanCount: state.kan?.declaredCount ?? 0,
        kanSets: state.kan?.sets ?? [],
        augments: state.augments ?? [],
      }
      : {
        rinshan: state.kan?.rinshanReady === true,
        kanCount: state.kan?.declaredCount ?? 0,
        kanSets: state.kan?.sets ?? [],
        augments: state.augments ?? [],
      },
  );

  return `
    <section class="shell">
      ${renderTopbar(round, score, isTutorial)}
      ${renderStatusGrid(state, round)}
      ${isTutorial ? renderTutorialGuide(state, score) : ""}
      ${renderTable(state)}
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
        <strong class="dora-tile">${renderDoraTiles(state)}</strong>
      </article>
      <article class="panel compact">
        <span class="label">획득 점수</span>
        <strong>${state.coins}</strong>
      </article>
    </section>
  `;
}

function renderTable(state) {
  const riichiState = getAvailableRiichi(state);
  const kanOptions = getAvailableKans(state);
  const kanCandidateKeys = new Set(kanOptions.map((kan) => kan.key));
  const riichiCandidates = state.riichi?.phase === "selectingDiscard" ? state.riichi.candidates : [];
  const exchangeDisabled = state.selected.length === 0 || state.discardsLeft === 0 || !canAct(state) || state.riichi?.active;
  const riichiDisabled = !riichiState.canRiichi;
  const submitDisabled = (state.status !== "playing" && state.status !== "tutorial")
    || (state.riichi?.active && state.riichi.phase !== "ready");
  const isTutorial = state.mode === "tutorial";
  const waitTitle = riichiState.waits.length ? ` title="대기패: ${riichiState.waits.map(tileName).join(", ")}"` : "";

  return `
    <section class="table ${state.riichi?.active ? "is-riichi" : ""}">
      <div class="table-layout">
        ${renderKanSets(state)}
        <div class="play-area">
          <div class="hand" aria-label="손패">
            ${state.hand.map((tile) => tileButton(tile, state.selected, state.riichi, state.kan, kanCandidateKeys, riichiCandidates)).join("")}
          </div>
          ${renderRiichiTrace(state)}
        </div>
      </div>
      <div class="actions">
        <button data-action="exchange" ${exchangeDisabled ? "disabled" : ""}>선택패 교환</button>
        <button data-action="declare-riichi"${waitTitle} ${riichiDisabled ? "disabled" : ""}>리치</button>
        ${state.riichi?.phase === "selectingDiscard" ? `<button class="secondary" data-action="cancel-riichi">리치 취소</button>` : ""}
        ${kanOptions.map((kan) => `<button data-action="declare-kan" data-kan-face="${kan.key}" title="${tileName(kan.tile)} 깡">깡</button>`).join("")}
        <button data-action="submit" ${submitDisabled ? "disabled" : ""}>조합 제출</button>
        <button class="secondary" data-action="${isTutorial ? "skip-tutorial" : "restart"}">${isTutorial ? "본 게임으로" : "새 게임"}</button>
      </div>
      <p class="message">${state.message}</p>
    </section>
  `;
}

function renderDoraTiles(state) {
  const dora = getVisibleDoraIndicators(state);
  const uraDora = getVisibleUraDoraIndicators(state, {
    includeUraDora: state.riichi?.active && state.riichi.phase === "ready",
  });
  const visible = [
    ...dora.map((tile) => ({ tile, label: "도라" })),
    ...uraDora.map((tile) => ({ tile, label: "뒷도라" })),
  ];
  return visible.length
    ? visible.map(({ tile, label }) => `<span title="${label}: ${tileName(tile)}">${renderTileFace(tile)}</span>`).join("")
    : "-";
}

function renderKanSets(state) {
  const sets = state.kan?.sets ?? [];
  return `
    <aside class="kan-area" aria-label="깡">
      ${sets.map((set) => `
        <div class="kan-set" title="${set.tiles.map(tileName).join(", ")}">
          ${set.tiles.map((tile) => `<span class="kan-set-tile">${renderTileFace(tile)}</span>`).join("")}
        </div>
      `).join("")}
    </aside>
  `;
}

function renderRiichiTrace(state) {
  if (!state.riichi?.active) return "";
  const discarded = state.riichi.lastDiscardedTile;
  const drawn = state.riichi.lastDrawnTile;
  const waits = state.riichi.waits.length ? state.riichi.waits.map(tileName).join(", ") : "";
  const candidates = state.riichi.phase === "selectingDiscard" ? state.riichi.candidates : [];
  return `
    <div class="riichi-trace" aria-live="polite">
      <span>리치 ${formatRiichiPhase(state.riichi.phase)}</span>
      ${discarded ? `<span class="riichi-trace-tile">버림 ${renderTileFace(discarded)}</span>` : ""}
      ${drawn ? `<span class="riichi-trace-tile">신규 ${renderTileFace(drawn)}</span>` : ""}
      ${waits ? `<small>대기 ${waits}</small>` : ""}
      ${candidates.length ? renderRiichiCandidates(candidates) : ""}
    </div>
  `;
}

function renderRiichiCandidates(candidates) {
  return `
    <div class="riichi-candidates">
      ${candidates.map((candidate) => `
        <span>
          ${renderTileFace(candidate.exchangeTile)}
          <small>${candidate.waits.map(tileName).join(", ")} 대기</small>
        </span>
      `).join("")}
    </div>
  `;
}

function formatRiichiPhase(phase) {
  return {
    declared: "선언",
    selectingDiscard: "버림패 선택",
    drawing: "진행",
    ready: "성공",
    failed: "실패",
  }[phase] ?? "";
}

function renderInfoGrid(state, score) {
  return `
    <section class="info-grid">
      <article class="panel">
        <h2>점수</h2>
        ${renderScore(score)}
      </article>
      <article class="panel">
        <h2>유물</h2>
        <div class="relics">${state.relics.length ? state.relics.map(renderRelic).join("") : `<p class="empty-note">-</p>`}</div>
      </article>
      <article class="panel">
        <h2>증강</h2>
        <div class="relics">${(state.augments ?? []).length ? state.augments.map(renderAugment).join("") : `<p class="empty-note">-</p>`}</div>
      </article>
    </section>
  `;
}

function renderOverlays(state, score, uiState) {
  return `
    ${state.status === "tutorialComplete" ? renderTutorialComplete(score) : ""}
    ${state.status === "startReward" ? renderReward(state.rewardOptions, "시작 유물 선택", "이번 게임에서 첫 번째로 사용할 유물을 고르세요.") : ""}
    ${state.status === "reward" ? renderReward(state.rewardOptions, "보상 선택", "라운드를 통과했습니다. 다음 라운드에 가져갈 유물을 하나 고르세요.") : ""}
    ${state.status === "lost" || state.status === "won" ? renderEnd(state.status, state.message) : ""}
    ${renderYakuHelp(uiState.isYakuModalOpen)}
    ${renderTermsHelp(uiState.isTermsModalOpen)}
  `;
}
