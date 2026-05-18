import { yakuReference } from "../../data/yaku-reference.js";
import { termReference } from "../../data/term-reference.js";
import { renderTileFace } from "../../tileArt.js";
import { formatRarity } from "./score.js";

export function renderYakuHelp(isOpen) {
  return `
    <button class="yaku-help-button" data-action="open-yaku">역 목록</button>
    ${isOpen ? `
      <section class="overlay">
        <div class="modal yaku-modal">
          <div class="modal-title">
            <div>
              <span class="label">참고</span>
              <h2>역 목록</h2>
            </div>
            <button class="icon-button" data-action="close-yaku" aria-label="역 목록 닫기">x</button>
          </div>
          <p class="modal-note">현재 게임에서 실제로 판정하는 역입니다. 각 역은 손패가 완성되었을 때 추가 점수를 줍니다.</p>
          <div class="yaku-list">
            ${yakuReference.map((item) => `
              <article class="yaku-item">
                <div>
                  <strong>${item.name}</strong>
                  <span>${item.text}</span>
                  ${renderYakuExample(item.exampleTiles)}
                </div>
                <b><span>${item.han}</span><small>${item.score}점</small></b>
              </article>
            `).join("")}
          </div>
        </div>
      </section>
    ` : ""}
  `;
}

function renderYakuExample(exampleTiles) {
  if (!exampleTiles) return "";
  return `
    <div class="yaku-example-hand" aria-label="예시 손패">
      ${parseExampleTiles(exampleTiles).map((tile) => `
        <span class="yaku-example-tile" title="${tile.suit}${tile.value}">
          ${renderTileFace(tile)}
        </span>
      `).join("")}
    </div>
  `;
}

function parseExampleTiles(text) {
  let index = 0;
  return text.trim().split(/\s+/).flatMap((group) => {
    const suit = group.at(-1);
    return [...group.slice(0, -1)].map((value) => ({
      suit,
      value: suit === "z" ? value : Number(value),
      copyId: `yaku-example-${index++}`,
    }));
  });
}

export function renderTermsHelp(isOpen) {
  return `
    <button class="terms-help-button" data-action="open-terms">용어 설명</button>
    ${isOpen ? `
      <section class="overlay">
        <div class="modal terms-modal">
          <div class="modal-title">
            <div>
              <span class="label">용어</span>
              <h2>마작 용어 설명</h2>
            </div>
            <button class="icon-button" data-action="close-terms" aria-label="용어 설명 닫기">x</button>
          </div>
          <p class="modal-note">처음 플레이해도 흐름을 따라갈 수 있도록 자주 나오는 용어만 정리했습니다.</p>
          <div class="term-list">
            ${termReference.map((item) => `
              <article class="term-item">
                <strong>${item.name}</strong>
                <span>${item.text}</span>
              </article>
            `).join("")}
          </div>
        </div>
      </section>
    ` : ""}
  `;
}

export function renderTutorialComplete(score) {
  return `
    <section class="overlay">
      <div class="modal">
        <h2>튜토리얼 완료</h2>
        <p>${score.totalScore}점으로 연습국을 통과했습니다. 본 게임에서는 무작위 손패, 제한된 교환 횟수, 유물과 상점으로 더 높은 목표 점수를 넘기면 됩니다.</p>
        <button data-action="start-main">본 게임 시작</button>
      </div>
    </section>
  `;
}

export function renderReward(rewardOptions, title = "보상 선택", note = "") {
  return `
    <section class="overlay">
      <div class="modal">
        <h2>${title}</h2>
        ${note ? `<p class="modal-note">${note}</p>` : ""}
        <div class="reward-grid">
          ${rewardOptions.map((reward) => `
            <button class="reward reward-${reward.type ?? "relic"} relic-${reward.rarity ?? "common"}" data-reward-id="${reward.id}">
              <small>${formatRewardType(reward.type)} - ${formatRarity(reward.rarity)}</small>
              <strong>${reward.name}</strong>
              <span>${reward.text}</span>
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function formatRewardType(type = "relic") {
  return {
    relic: "유물",
    augment: "증강",
  }[type] ?? "보상";
}

export function renderEnd(status, message) {
  return `
    <section class="overlay">
      <div class="modal">
        <h2>${status === "won" ? "완주 성공" : "게임 오버"}</h2>
        <p>${message}</p>
        <button data-action="restart">새 게임</button>
      </div>
    </section>
  `;
}
