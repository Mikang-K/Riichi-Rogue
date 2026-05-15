import {
  toggleTile,
  exchangeSelected,
  declareRiichi,
  confirmRiichiDiscard,
  declareKan,
  advanceRiichi,
  submitHand,
  newRun,
  newTutorial,
  chooseRelic,
} from "../game.js";
import { playSfx, startBackgroundMusic, toggleBackgroundMusic } from "./audio.js";

export function initEvents({ getState, setState, getUiState, setUiState, rerender }) {
  let riichiTimer = null;

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

  document.querySelector("#app").addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    const tileId = e.target.closest("[data-tile]")?.dataset.tile;
    const relicId = e.target.closest("[data-relic]")?.dataset.relic;
    const kanFace = e.target.closest("[data-kan-face]")?.dataset.kanFace;
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

    if (relicId) {
      setState(chooseRelic(getState(), relicId));
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
      case "declare-kan":
        setState(declareKan(getState(), kanFace));
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
      case "start-tutorial":
        clearRiichiTimer();
        setState(newTutorial());
        rerender();
        break;
      case "open-yaku":
        setUiState({ isYakuModalOpen: true });
        rerender();
        break;
      case "close-yaku":
        setUiState({ isYakuModalOpen: false });
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
      default:
        break;
    }
  });

  document.addEventListener("keydown", () => {
    startBackgroundMusic({ muted: getUiState().isMusicMuted });
  }, { once: true });
}
