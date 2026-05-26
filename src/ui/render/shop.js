import { tileName } from "../../game.js";
import { renderTileFace } from "../../tileArt.js";
import { formatRarity } from "./score.js";
import { renderTermText } from "./terms.js";
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
            <span class="label">${renderTermText("상점")}</span>
            <h2>${renderTermText(isTutorial ? "튜토리얼 상점" : "라운드 사이 준비")}</h2>
          </div>
          <strong class="shop-coins">${state.coins}${renderTermText("코인")}</strong>
        </div>
        ${renderRewardSummary(shop)}
        ${isTutorial ? `<p class="modal-note">${renderTermText("왼쪽은 유물과 증강, 오른쪽은 패 편집입니다. 이번에는 오른쪽의 강화 후보 3개 중 하나를 선택해 보세요.")}</p>` : ""}
        <div class="shop-layout">
          <section class="shop-section">
            <h3>${renderTermText("유물과 증강")}</h3>
            <div class="shop-offers">
              ${renderShopOffers(shop, shop.offers.relics ?? [], "유물", state.coins)}
              ${renderShopOffers(shop, shop.offers.augments ?? [], "증강", state.coins)}
            </div>
          </section>
          <section class="shop-section">
            <h3>${renderTermText("패 편집")}</h3>
            ${renderEditLimits(shop)}
            <div class="shop-edit-groups">
              ${renderTileChoiceGroup(state, "강화", shop.offers.tileUpgrades ?? [], "upgradeTile")}
              ${renderTileChoiceGroup(state, "추가", shop.offers.tileAdds ?? [], "addTile")}
              ${renderTileChoiceGroup(state, "삭제", shop.offers.tileRemoves ?? [], "removeTile")}
            </div>
          </section>
        </div>
        <p class="message">${renderTermText(state.message)}</p>
        <div class="shop-actions">
          ${isTutorial ? "" : `<button data-action="reroll-shop" ${state.coins < (shop.rerollPrice ?? 2) ? "disabled" : ""}>${renderTermText("리롤")} ${shop.rerollPrice ?? 2}${renderTermText("코인")}</button>`}
          <button data-action="leave-shop" data-tutorial-target="leave-shop" class="${tutorialTarget === "leave-shop" ? "tutorial-target-active" : ""}" ${isTutorial && !state.tutorial?.hasEditedTile ? "disabled" : ""}>${renderTermText(isTutorial ? "튜토리얼 완료" : "다음 라운드")}</button>
        </div>
      </div>
    </section>
  `;
}

function renderRewardSummary(shop) {
  const reward = shop.lastReward;
  return `
    <p class="modal-note">
      ${renderTermText("점수")} ${shop.lastScore} / ${renderTermText("목표 점수")} ${shop.lastTargetScore}.
      ${renderTermText("획득 코인")}: ${reward.totalCoins}개(${renderTermText("기본")} ${reward.baseCoins}개 + ${renderTermText("초과 보너스")} ${reward.bonusCoins}개).
    </p>
  `;
}

function renderEditLimits(shop) {
  return `
    <div class="shop-limits">
      <span>${renderTermText("강화")} ${shop.editsUsed.upgradeTile}/${shop.editsLimit.upgradeTile}</span>
      <span>${renderTermText("추가")} ${shop.editsUsed.addTile}/${shop.editsLimit.addTile}</span>
      <span>${renderTermText("삭제")} ${shop.editsUsed.removeTile}/${shop.editsLimit.removeTile}</span>
    </div>
  `;
}

function renderShopOffers(shop, offers, label, coins) {
  return offers.map((offer) => `
    <div class="shop-offer-card ${isOfferLocked(shop, offer) ? "is-locked" : ""}">
      <button
        class="shop-offer relic-${offer.rarity ?? "common"}"
        data-action="buy-shop-offer"
        data-shop-offer-id="${offer.id}"
        ${offer.sold || coins < offer.price ? "disabled" : ""}
      >
        <small>${renderTermText(label)} - ${formatRarity(offer.rarity)} - ${offer.price}${renderTermText("코인")}</small>
        <strong>${renderTermText(offer.name)}</strong>
        <span>${renderTermText(offer.text)}</span>
      </button>
      ${renderLockButton(shop, offer)}
    </div>
  `).join("");
}

function renderTileChoiceGroup(state, label, offers, editType) {
  return `
    <section class="shop-edit-group">
      <h4>${renderTermText(label)}</h4>
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
      <div class="shop-offer-card ${isOfferLocked(state.shop, offer) ? "is-locked" : ""}">
        <button
          class="shop-offer shop-tile-offer ${isActiveTarget ? "tutorial-target-active" : ""}"
          data-action="buy-shop-offer"
          data-shop-offer-id="${offer.id}"
          ${tileTutorialTarget ? `data-tutorial-target="${tileTutorialTarget}"` : ""}
          ${offer.sold || used >= limit || state.coins < offer.price ? "disabled" : ""}
        >
          <small>${renderTermText(label)} - ${offer.price}${renderTermText("코인")}</small>
          <span class="shop-offer-tile">${renderTileFace(offer.tile)}</span>
          <strong>${tileName(offer.tile)}</strong>
          <span>${renderTermText(`${bonus ? `현재 +${bonus}. ` : ""}${offer.text}`)}</span>
        </button>
        ${renderLockButton(state.shop, offer, state.mode === "tutorial")}
      </div>
    `;
  }).join("");
}

function renderLockButton(shop, offer, hidden = false) {
  if (hidden) return "";
  return `
    <button class="shop-lock-button" data-action="toggle-shop-lock" data-shop-offer-id="${offer.id}" ${offer.sold ? "disabled" : ""}>
      ${renderTermText(isOfferLocked(shop, offer) ? "잠금 해제" : "잠금")}
    </button>
  `;
}

function isOfferLocked(shop, offer) {
  return (shop.lockedOfferIds ?? []).includes(offer.id);
}
