import { yakuReference } from "../../data/yaku-reference.js";
import { termReference } from "../../data/term-reference.js";

export function renderYakuHelp(isOpen) {
  return `
    <button class="yaku-help-button" data-action="open-yaku">역 목록</button>
    ${isOpen ? `
      <section class="overlay">
        <div class="modal yaku-modal">
          <div class="modal-title">
            <div>
              <span class="label">Reference</span>
              <h2>리치마작 역 목록</h2>
            </div>
            <button class="icon-button" data-action="close-yaku" aria-label="역 목록 닫기">×</button>
          </div>
          <p class="modal-note">역은 손패에 붙는 점수 조건입니다. 이 MVP는 아래 중 일부를 구현했고, 나머지는 확장 후보로 볼 수 있습니다.</p>
          <div class="yaku-list">
            ${yakuReference.map((item) => `
              <article class="yaku-item">
                <div>
                  <strong>${item.name}</strong>
                  <span>${item.text}</span>
                  <em>${item.example}</em>
                </div>
                <b>${item.han}</b>
              </article>
            `).join("")}
          </div>
        </div>
      </section>
    ` : ""}
  `;
}

export function renderTermsHelp(isOpen) {
  return `
    <button class="terms-help-button" data-action="open-terms">용어 설명</button>
    ${isOpen ? `
      <section class="overlay">
        <div class="modal terms-modal">
          <div class="modal-title">
            <div>
              <span class="label">Glossary</span>
              <h2>마작 용어 설명</h2>
            </div>
            <button class="icon-button" data-action="close-terms" aria-label="용어 설명 닫기">×</button>
          </div>
          <p class="modal-note">마작을 처음 접해도 플레이 흐름을 따라갈 수 있도록, 이 게임에서 자주 나오는 용어만 먼저 정리했습니다.</p>
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
        <p>${score.totalScore}점으로 연습국을 통과했습니다. 본 게임에서는 무작위 손패, 제한된 교환 횟수, 유물 보상으로 더 높은 목표 점수를 넘기면 됩니다.</p>
        <button data-action="start-main">본 게임 시작</button>
      </div>
    </section>
  `;
}

export function renderReward(rewardOptions) {
  return `
    <section class="overlay">
      <div class="modal">
        <h2>보상 선택</h2>
        <div class="reward-grid">
          ${rewardOptions.map((relic) => `
            <button class="reward" data-relic="${relic.id}">
              <strong>${relic.name}</strong>
              <span>${relic.text}</span>
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;
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
