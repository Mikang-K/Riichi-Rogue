import {
  chooseRelic,
  exchangeSelected,
  newRun,
  newTitle,
  newTutorial,
  rounds,
  scoreHand,
  submitHand,
  tileName,
  tutorialRound,
  toggleTile,
} from "./game.js";
import { renderTileFace } from "./tileArt.js";

const app = document.querySelector("#app");
let state = newTitle();
let isYakuModalOpen = false;
let isTermsModalOpen = false;

const yakuReference = [
  { name: "리치", han: "1판", text: "문전 상태에서 텐파이를 선언하는 역입니다. 이 MVP에는 아직 리치 선언 버튼은 없습니다.", example: "대기 완성 직전 선언" },
  { name: "멘젠쯔모", han: "1판", text: "남의 도움 없이 스스로 뽑은 패로 완성하면 붙는 역입니다.", example: "마지막 패를 직접 뽑아 완성" },
  { name: "탕야오", han: "1판", text: "1, 9, 자패 없이 2부터 8까지의 숫자패만 사용합니다.", example: "🀈🀉🀊 🀚🀛🀜 🀒🀓🀔 🀌🀍🀎 🀝🀝" },
  { name: "핑후", han: "1판", text: "모든 몸통이 연속 숫자 3장이고, 머리가 점수패가 아닌 기본형입니다.", example: "🀇🀈🀉 🀚🀛🀜 🀒🀓🀔 🀌🀍🀎 🀝🀝" },
  { name: "역패", han: "1판", text: "백, 발, 중 또는 조건에 맞는 바람패를 3장 모으면 붙습니다.", example: "🀄🀄🀄 또는 🀅🀅🀅" },
  { name: "칠대자", han: "2판", text: "같은 패 2장짜리 쌍을 7개 만드는 특수 형태입니다.", example: "🀇🀇 🀊🀊 🀚🀚 🀝🀝 🀒🀒 🀖🀖 🀄🀄" },
  { name: "또이또이", han: "2판", text: "모든 몸통을 같은 패 3장으로 만듭니다.", example: "🀇🀇🀇 🀜🀜🀜 🀔🀔🀔 🀄🀄🀄 🀚🀚" },
  { name: "삼색동순", han: "2판", text: "만수, 통수, 삭수에 같은 숫자 연속 묶음을 하나씩 만듭니다.", example: "🀈🀉🀊 + 🀚🀛🀜 + 🀑🀒🀓" },
  { name: "일기통관", han: "2판", text: "한 종류의 숫자패로 1-2-3, 4-5-6, 7-8-9를 모두 만듭니다.", example: "🀇🀈🀉 + 🀊🀋🀌 + 🀍🀎🀏" },
  { name: "혼일색", han: "3판", text: "한 종류의 숫자패와 자패만 사용합니다.", example: "🀇🀈🀉 🀊🀋🀌 🀍🀎🀏 🀄🀄🀄 🀀🀀" },
  { name: "청일색", han: "6판", text: "한 종류의 숫자패만 사용합니다. 자패도 들어가면 안 됩니다.", example: "🀙🀚🀛 🀜🀝🀞 🀟🀠🀡 🀚🀛🀜 🀝🀝" },
];

const termReference = [
  { name: "손패", text: "플레이어가 들고 있는 패입니다. 이 게임에서는 14장을 보고 조합을 만듭니다." },
  { name: "패산", text: "아직 뽑지 않은 남은 패 더미입니다. 교환하면 여기서 새 패를 받습니다." },
  { name: "몸통", text: "같은 패 3장 또는 같은 종류의 연속 숫자 3장으로 만든 묶음입니다." },
  { name: "머리", text: "같은 패 2장으로 만든 쌍입니다. 기본 화료 형태에는 머리 1개가 필요합니다." },
  { name: "화료", text: "손패가 완성되어 제출할 수 있는 상태입니다. 여기서는 4몸통+1머리 또는 칠대자를 뜻합니다." },
  { name: "판수", text: "역, 도라, 유물로 얻는 점수 단위입니다. 현재 판수가 목표 판수 이상이면 라운드를 통과합니다." },
  { name: "역", text: "특정 조건을 만족하는 손패 보너스입니다. 예를 들어 탕야오, 핑후, 칠대자가 있습니다." },
  { name: "도라", text: "가지고 있으면 추가 판수를 주는 보너스 패입니다. 화면 위쪽의 도라 표시패와 같은 패를 들고 있으면 판수가 오릅니다." },
  { name: "자패", text: "숫자가 없는 글자패입니다. 동, 남, 서, 북, 백, 발, 중이 여기에 속합니다." },
  { name: "문전", text: "남의 버림패를 가져오지 않고 자기 손패만으로 진행한 상태입니다. 실제 리치마작의 여러 역 조건에 쓰입니다." },
  { name: "텐파이", text: "한 장만 더 들어오면 완성되는 대기 상태입니다." },
  { name: "유물", text: "Balatro식 강화 효과입니다. 판수를 올리거나 교환 횟수 같은 플레이어 상태를 바꿀 수 있습니다." },
];

function render() {
  if (state.mode === "title") {
    renderTitle();
    return;
  }

  const isTutorial = state.mode === "tutorial";
  const round = isTutorial ? tutorialRound : rounds[state.roundIndex] ?? rounds[rounds.length - 1];
  const score = scoreHand(state.hand, state.dora, state.relics);

  app.innerHTML = `
    <section class="shell">
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

      ${isTutorial ? renderTutorialGuide(score) : ""}

      <section class="table">
        <div class="hand" aria-label="손패">
          ${state.hand.map((tile) => tileButton(tile)).join("")}
        </div>
        <div class="actions">
          <button data-action="exchange" ${state.selected.length === 0 || state.discardsLeft === 0 || !canAct() ? "disabled" : ""}>선택패 교환</button>
          <button data-action="submit" ${state.status !== "playing" && state.status !== "tutorial" ? "disabled" : ""}>조합 제출</button>
          <button data-action="${isTutorial ? "skip-tutorial" : "restart"}">${isTutorial ? "본 게임으로" : "새 게임"}</button>
        </div>
        <p class="message">${state.message}</p>
      </section>

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

      ${state.status === "tutorialComplete" ? renderTutorialComplete(score) : ""}
      ${state.status === "reward" ? renderReward() : ""}
      ${state.status === "lost" || state.status === "won" ? renderEnd() : ""}
      ${renderYakuHelp()}
      ${renderTermsHelp()}
    </section>
  `;

  bindEvents();
}

function renderTitle() {
  app.innerHTML = `
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
      ${renderYakuHelp()}
      ${renderTermsHelp()}
    </section>
  `;

  bindEvents();
}

function renderTermsHelp() {
  return `
    <button class="terms-help-button" data-action="open-terms">용어 설명</button>
    ${isTermsModalOpen ? `
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

function renderYakuHelp() {
  return `
    <button class="yaku-help-button" data-action="open-yaku">역 목록</button>
    ${isYakuModalOpen ? `
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

function tileButton(tile) {
  const selected = state.selected.includes(tile.copyId);
  const classes = ["tile", tile.suit === "z" ? "honor" : tile.suit, selected ? "selected" : ""].join(" ");
  return `<button class="${classes}" data-tile="${tile.copyId}" aria-label="${tileName(tile)}" aria-pressed="${selected}" title="${tileName(tile)}">${renderTileFace(tile)}</button>`;
}

function canAct() {
  return state.status === "playing" || state.status === "tutorial";
}

function renderTutorialGuide(score) {
  return `
    <section class="tutorial-stage panel">
      <div class="tutorial-copy">
        <span class="label">튜토리얼</span>
        <h2>한 장을 바꿔 완성 손패를 만들어 보세요</h2>
        <p>마작은 같은 그림 3장, 또는 같은 종류의 연속 숫자 3장을 모아 작은 묶음을 만드는 게임입니다. 이 게임에서는 손패 14장으로 묶음 4개와 같은 패 2장짜리 머리 1개를 만들면 제출할 수 있습니다.</p>
        <p>이번 연습 손패는 거의 완성되어 있습니다. 필요 없는 동을 선택해 교환하면 6통이 들어오고, 2통-3통-4통과 6통-6통 머리가 맞춰져 바로 화료할 수 있습니다.</p>
      </div>
      <ol class="tutorial-steps">
        <li class="${state.discardsLeft === 1 ? "is-current" : "is-done"}">
          <strong>1. 필요 없는 패 고르기</strong>
          <span>동은 숫자 패가 아니라 이번 연습 조합에 이어 붙일 수 없습니다. 손패에서 동을 클릭해 선택하세요.</span>
        </li>
        <li class="${state.discardsLeft === 0 && !score.isComplete ? "is-current" : state.discardsLeft === 0 ? "is-done" : ""}">
          <strong>2. 선택패 교환</strong>
          <span>선택패 교환을 누르면 선택한 패를 버리고 새 패를 받습니다. 튜토리얼에서는 다음 패가 6통으로 고정되어 있습니다.</span>
        </li>
        <li class="${score.isComplete ? "is-current" : ""}">
          <strong>3. 조합 제출</strong>
          <span>완성 후 조합 제출을 누르세요. 탕야오와 핑후라는 역 점수, 도라 점수, 유물 보너스가 더해져 목표 점수를 넘깁니다.</span>
        </li>
        <li class="${state.status === "tutorialComplete" ? "is-current" : ""}">
          <strong>4. 본 게임 진입</strong>
          <span>튜토리얼을 끝내면 무작위 손패로 시작하는 본 게임에 들어갈 수 있습니다.</span>
        </li>
      </ol>
    </section>
  `;
}

function renderScore(score) {
  const yaku = score.yaku.length
    ? score.yaku.map((item) => `<li><span>${item.name}</span><strong>${item.score}점</strong></li>`).join("")
    : `<li><span>${score.isComplete ? "역 없음" : "미완성 손패"}</span><strong>0점</strong></li>`;
  const relics = score.relicBonuses.length
    ? score.relicBonuses.map(renderRelicBonus).join("")
    : `<li><span>발동 유물 없음</span><strong>0점</strong></li>`;

  return `
    <ul class="score-list">
      <li><span>패 기본 점수</span><strong>${score.tileScore}점</strong></li>
      <li><span>패 점수 보너스</span><strong>+${score.tileScoreBonus}점</strong></li>
      <li><span>패 배수</span><strong>x${formatMultiplier(score.tileMultiplier)}</strong></li>
      ${yaku}
      <li><span>도라</span><strong>${score.doraScore}점</strong></li>
      ${relics}
      <li><span>역 배수</span><strong>x${formatMultiplier(score.yakuMultiplier)}</strong></li>
      <li><span>전체 배수</span><strong>x${formatMultiplier(score.globalMultiplier)}</strong></li>
      <li><span>최종 점수</span><strong>${score.totalScore}점</strong></li>
    </ul>
  `;
}

function renderRelicBonus(item) {
  const bonus = item.bonus;
  const parts = [
    bonus.tileScoreBonus ? `패 +${bonus.tileScoreBonus}` : "",
    bonus.yakuScoreBonus ? `역 +${bonus.yakuScoreBonus}` : "",
    bonus.tileMultiplierBonus ? `패 x+${formatMultiplier(bonus.tileMultiplierBonus)}` : "",
    bonus.yakuMultiplierBonus ? `역 x+${formatMultiplier(bonus.yakuMultiplierBonus)}` : "",
    bonus.globalMultiplierBonus ? `전체 x+${formatMultiplier(bonus.globalMultiplierBonus)}` : "",
  ].filter(Boolean);
  return `<li><span>${item.relic.name}</span><strong>${parts.join(", ")}</strong></li>`;
}

function formatMultiplier(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function renderRelic(relic) {
  return `
    <div class="relic">
      <strong>${relic.name}</strong>
      <span>${relic.text}</span>
    </div>
  `;
}

function renderTutorialComplete(score) {
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

function renderReward() {
  return `
    <section class="overlay">
      <div class="modal">
        <h2>보상 선택</h2>
        <div class="reward-grid">
          ${state.rewardOptions.map((relic) => `
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

function renderEnd() {
  return `
    <section class="overlay">
      <div class="modal">
        <h2>${state.status === "won" ? "완주 성공" : "게임 오버"}</h2>
        <p>${state.message}</p>
        <button data-action="restart">새 게임</button>
      </div>
    </section>
  `;
}

function bindEvents() {
  app.querySelectorAll("[data-tile]").forEach((button) => {
    button.addEventListener("click", () => {
      state = toggleTile(state, button.dataset.tile);
      render();
    });
  });

  app.querySelectorAll("[data-action='exchange']").forEach((button) => {
    button.addEventListener("click", () => {
      state = exchangeSelected(state);
      render();
    });
  });

  app.querySelectorAll("[data-action='submit']").forEach((button) => {
    button.addEventListener("click", () => {
      state = submitHand(state);
      render();
    });
  });

  app.querySelectorAll("[data-action='restart']").forEach((button) => {
    button.addEventListener("click", () => {
      state = newRun();
      render();
    });
  });

  app.querySelectorAll("[data-action='skip-tutorial'], [data-action='start-main']").forEach((button) => {
    button.addEventListener("click", () => {
      state = newRun();
      render();
    });
  });

  app.querySelectorAll("[data-action='start-tutorial']").forEach((button) => {
    button.addEventListener("click", () => {
      state = newTutorial();
      render();
    });
  });

  app.querySelectorAll("[data-action='open-yaku']").forEach((button) => {
    button.addEventListener("click", () => {
      isYakuModalOpen = true;
      render();
    });
  });

  app.querySelectorAll("[data-action='close-yaku']").forEach((button) => {
    button.addEventListener("click", () => {
      isYakuModalOpen = false;
      render();
    });
  });

  app.querySelectorAll("[data-action='open-terms']").forEach((button) => {
    button.addEventListener("click", () => {
      isTermsModalOpen = true;
      render();
    });
  });

  app.querySelectorAll("[data-action='close-terms']").forEach((button) => {
    button.addEventListener("click", () => {
      isTermsModalOpen = false;
      render();
    });
  });

  app.querySelectorAll("[data-relic]").forEach((button) => {
    button.addEventListener("click", () => {
      state = chooseRelic(state, button.dataset.relic);
      render();
    });
  });
}

render();
