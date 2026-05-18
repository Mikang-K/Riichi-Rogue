import { tileName } from "../../game.js";
import { renderTileFace } from "../../tileArt.js";
import { formatRarity } from "./score.js";
import { getTutorialTarget } from "./tutorial.js";

export function renderShop(state) {
  const shop = state.shop;
  if (!shop) return "";
  const isTutorial = state.mode === "tutorial";
  const tutorialTarget = isTutorial ? getTutorialTarget(state) : null;

  return `
    <section class="overlay">
      <div class="modal shop-modal">
        <div class="modal-title">
          <div>
            <span class="label">상점</span>
            <h2>${isTutorial ? "튜토리얼 상점" : "라운드 사이 준비"}</h2>
          </div>
          <strong class="shop-coins">${state.coins}코인</strong>
        </div>
        ${renderRewardSummary(shop)}
        ${isTutorial ? `<p class="modal-note">왼쪽은 유물과 증강, 오른쪽은 패 편집입니다. 이번에는 오른쪽의 강화 후보 3개 중 하나를 선택해 보세요.</p>` : ""}
        <div class="shop-layout">
          <section class="shop-section">
            <h3>유물과 증강</h3>
            <div class="shop-offers">
              ${renderShopOffers(shop.offers.relics, "유물")}
              ${renderShopOffers(shop.offers.augments, "증강")}
            </div>
          </section>
          <section class="shop-section">
            <h3>패 편집</h3>
            ${renderEditLimits(shop)}
            <div class="shop-edit-groups">
              ${renderTileChoiceGroup(state, "강화", shop.offers.tileUpgrades ?? [], "upgradeTile")}
              ${renderTileChoiceGroup(state, "추가", shop.offers.tileAdds ?? [], "addTile")}
              ${renderTileChoiceGroup(state, "삭제", shop.offers.tileRemoves ?? [], "removeTile")}
            </div>
          </section>
        </div>
        <p class="message">${state.message}</p>
        <div class="shop-actions">
          <button data-action="leave-shop" data-tutorial-target="leave-shop" class="${tutorialTarget === "leave-shop" ? "tutorial-target-active" : ""}" ${isTutorial && !state.tutorial?.hasEditedTile ? "disabled" : ""}>${isTutorial ? "튜토리얼 완료" : "다음 라운드"}</button>
        </div>
      </div>
    </section>
  `;
}

function renderRewardSummary(shop) {
  const reward = shop.lastReward;
  return `
    <p class="modal-note">
      점수 ${shop.lastScore} / 목표 ${shop.lastTargetScore}.
      획득 코인: ${reward.totalCoins}개 (기본 ${reward.baseCoins}개 + 초과 보너스 ${reward.bonusCoins}개).
    </p>
  `;
}

function renderEditLimits(shop) {
  return `
    <div class="shop-limits">
      <span>강화 ${shop.editsUsed.upgradeTile}/${shop.editsLimit.upgradeTile}</span>
      <span>추가 ${shop.editsUsed.addTile}/${shop.editsLimit.addTile}</span>
      <span>삭제 ${shop.editsUsed.removeTile}/${shop.editsLimit.removeTile}</span>
    </div>
  `;
}

function renderShopOffers(offers, label) {
  return offers.map((offer) => `
    <button
      class="shop-offer relic-${offer.rarity ?? "common"}"
      data-action="buy-shop-offer"
      data-shop-offer-id="${offer.id}"
      ${offer.sold ? "disabled" : ""}
    >
      <small>${label} - ${formatRarity(offer.rarity)} - ${offer.price}코인</small>
      <strong>${offer.name}</strong>
      <span>${offer.text}</span>
    </button>
  `).join("");
}

function renderTileChoiceGroup(state, label, offers, editType) {
  return `
    <section class="shop-edit-group">
      <h4>${label}</h4>
      <div class="shop-tile-choices">
        ${renderTileChoiceOffers(state, offers, label, editType)}
      </div>
    </section>
  `;
}

function renderTileChoiceOffers(state, offers, label, editType) {
  const used = state.shop.editsUsed[editType] ?? 0;
  const limit = state.shop.editsLimit[editType] ?? 0;
  const tutorialTarget = state.mode === "tutorial" ? getTutorialTarget(state) : null;
  const tileTutorialTarget = editType === "upgradeTile" ? "upgrade-offer" : "";
  const isActiveTarget = tutorialTarget === tileTutorialTarget;
  return offers.map((offer) => {
    const bonus = offer.tile.enhancement?.tileScoreBonus ?? 0;
    return `
      <button
        class="shop-offer shop-tile-offer ${isActiveTarget ? "tutorial-target-active" : ""}"
        data-action="buy-shop-offer"
        data-shop-offer-id="${offer.id}"
        ${tileTutorialTarget ? `data-tutorial-target="${tileTutorialTarget}"` : ""}
        ${offer.sold || used >= limit || state.coins < offer.price ? "disabled" : ""}
      >
        <small>${label} - ${offer.price}코인</small>
        <span class="shop-offer-tile">${renderTileFace(offer.tile)}</span>
        <strong>${tileName(offer.tile)}</strong>
        <span>${bonus ? `현재 +${bonus}. ` : ""}${offer.text}</span>
      </button>
    `;
  }).join("");
}
