import {
  toggleTile,
  exchangeSelected,
  declareRiichi,
  confirmRiichiDiscard,
  cancelRiichi,
  declareKan,
  advanceRiichi,
  submitHand,
  newRun,
  newTutorial,
  chooseReward,
  buyShopOffer,
  rerollShop,
  toggleShopOfferLock,
  leaveShop,
} from "../game.js";
import { clearRunSave, loadRunSave, restoreSavedState } from "../game/save.js";
import { playSfx, startBackgroundMusic, toggleBackgroundMusic } from "./audio.js";
import { escapeHtml, getTermDefinition } from "./render/terms.js";

export function initEvents({ getState, setState, getUiState, setUiState, rerender }) {
  let riichiTimer = null;
  let activeTermTrigger = null;
  let termTooltip = null;

  function clearRiichiTimer() {
    if (!riichiTimer) return;
    window.clearTimeout(riichiTimer);
    riichiTimer = null;
  }

  function scheduleRiichiAdvance() {
    clearRiichiTimer();
    riichiTimer = window.setTimeout(() => {
      const state = getState();
      if (!["declared", "drawing"].includes(state.riichi?.phase)) return;
      setState(advanceRiichi(state));
      rerender();
      if (["declared", "drawing"].includes(getState().riichi?.phase)) scheduleRiichiAdvance();
    }, 450);
  }

  function ensureTermTooltip() {
    if (termTooltip) return termTooltip;
    termTooltip = document.createElement("div");
    termTooltip.className = "term-floating-tooltip";
    termTooltip.setAttribute("role", "tooltip");
    document.body.append(termTooltip);
    return termTooltip;
  }

  function showTermTooltip(trigger) {
    const term = getTermDefinition(trigger.dataset.termName);
    if (!term) return;
    activeTermTrigger = trigger;
    const tooltip = ensureTermTooltip();
    tooltip.innerHTML = `
      <strong>${escapeHtml(term.name)}</strong>
      <span>${escapeHtml(term.text)}</span>
    `;
    tooltip.classList.add("is-visible");
    positionTermTooltip(trigger);
  }

  function positionTermTooltip(trigger) {
    if (!termTooltip) return;
    const rect = trigger.getBoundingClientRect();
    const tooltipRect = termTooltip.getBoundingClientRect();
    const gap = 10;
    const margin = 12;
    const maxLeft = window.innerWidth - tooltipRect.width - margin;
    const left = Math.max(margin, Math.min(maxLeft, rect.left + rect.width / 2 - tooltipRect.width / 2));
    const topAbove = rect.top - tooltipRect.height - gap;
    const top = topAbove > margin ? topAbove : rect.bottom + gap;
    termTooltip.style.left = `${left}px`;
    termTooltip.style.top = `${top}px`;
  }

  function hideTermTooltip() {
    activeTermTrigger = null;
    termTooltip?.classList.remove("is-visible");
  }

  const app = document.querySelector("#app");

  app.addEventListener("pointerover", (e) => {
    const trigger = e.target.closest("[data-term-name]");
    if (!trigger || !app.contains(trigger)) return;
    showTermTooltip(trigger);
  });

  app.addEventListener("pointerout", (e) => {
    const trigger = e.target.closest("[data-term-name]");
    if (!trigger || trigger !== activeTermTrigger || trigger.contains(e.relatedTarget)) return;
    hideTermTooltip();
  });

  window.addEventListener("resize", hideTermTooltip);
  document.addEventListener("scroll", hideTermTooltip, true);

  app.addEventListener("click", (e) => {
    hideTermTooltip();
    const action = e.target.closest("[data-action]")?.dataset.action;
    const tileId = e.target.closest("[data-tile]")?.dataset.tile;
    const rewardId = e.target.closest("[data-reward-id]")?.dataset.rewardId;
    const relicId = e.target.closest("[data-relic]")?.dataset.relic;
    const kanFace = e.target.closest("[data-kan-face]")?.dataset.kanFace;
    const shopOfferId = e.target.closest("[data-shop-offer-id]")?.dataset.shopOfferId;
    const yakuPage = e.target.closest("[data-yaku-page]")?.dataset.yakuPage;
    const uiState = getUiState();

    if (action !== "toggle-music") {
      startBackgroundMusic({ muted: uiState.isMusicMuted });
    }

    if (tileId) {
      const state = getState();
      if (state.riichi?.phase === "selectingDiscard") {
        setState(confirmRiichiDiscard(state, tileId));
        rerender();
        if (getState().riichi?.phase === "declared") scheduleRiichiAdvance();
        return;
      }
      setState(toggleTile(state, tileId));
      rerender();
      return;
    }

    if (rewardId || relicId) {
      setState(chooseReward(getState(), rewardId ?? relicId));
      rerender();
      return;
    }

    if (shopOfferId && action === "buy-shop-offer") {
      setState(buyShopOffer(getState(), shopOfferId));
      rerender();
      return;
    }

    switch (action) {
      case "exchange":
        {
          const before = getState();
          const after = exchangeSelected(before);
          setState(after);
          if (after.discardsLeft < before.discardsLeft) playSfx("exchange", { muted: uiState.isMusicMuted });
        }
        rerender();
        break;
      case "declare-riichi":
        setState(declareRiichi(getState()));
        rerender();
        if (["declared", "drawing"].includes(getState().riichi?.phase)) scheduleRiichiAdvance();
        break;
      case "cancel-riichi":
        clearRiichiTimer();
        setState(cancelRiichi(getState()));
        rerender();
        break;
      case "declare-kan":
        setState(declareKan(getState(), kanFace));
        rerender();
        break;
      case "leave-shop":
        setState(leaveShop(getState()));
        rerender();
        break;
      case "reroll-shop":
        setState(rerollShop(getState()));
        rerender();
        break;
      case "toggle-shop-lock":
        setState(toggleShopOfferLock(getState(), shopOfferId));
        rerender();
        break;
      case "submit":
        clearRiichiTimer();
        {
          const before = getState();
          const after = submitHand(before);
          setState(after);
          const didSubmit = after !== before;
          if (didSubmit && ["reward", "won", "tutorialComplete"].includes(after.status)) {
            playSfx("submit-success", { muted: uiState.isMusicMuted });
          } else if (didSubmit) {
            playSfx("submit-fail", { muted: uiState.isMusicMuted });
          }
        }
        rerender();
        break;
      case "restart":
        clearRiichiTimer();
        setState(newRun());
        rerender();
        break;
      case "start-main":
      case "skip-tutorial":
        clearRiichiTimer();
        setState(newRun());
        rerender();
        break;
      case "resume-run":
        {
          const restored = restoreSavedState(loadRunSave());
          if (restored) setState(restored);
        }
        rerender();
        break;
      case "clear-save":
        clearRunSave();
        rerender();
        break;
      case "start-tutorial":
        clearRiichiTimer();
        setState(newTutorial());
        rerender();
        break;
      case "open-yaku":
        setUiState({ isYakuModalOpen: true, yakuHelpPage: "standard" });
        rerender();
        break;
      case "close-yaku":
        setUiState({ isYakuModalOpen: false });
        rerender();
        break;
      case "set-yaku-page":
        setUiState({ yakuHelpPage: yakuPage ?? "standard" });
        rerender();
        break;
      case "open-terms":
        setUiState({ isTermsModalOpen: true });
        rerender();
        break;
      case "close-terms":
        setUiState({ isTermsModalOpen: false });
        rerender();
        break;
      case "toggle-music": {
        const nextMuted = !uiState.isMusicMuted;
        setUiState({ isMusicMuted: nextMuted });
        toggleBackgroundMusic({ muted: nextMuted });
        rerender();
        break;
      }
      case "toggle-score-detail":
        setUiState({ isScoreDetailOpen: !uiState.isScoreDetailOpen });
        rerender();
        break;
      default:
        break;
    }
  });

  document.addEventListener("keydown", () => {
    startBackgroundMusic({ muted: getUiState().isMusicMuted });
  }, { once: true });
}
