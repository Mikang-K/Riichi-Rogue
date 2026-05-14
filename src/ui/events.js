import {
  toggleTile,
  exchangeSelected,
  submitHand,
  newRun,
  newTutorial,
  chooseRelic,
} from "../game.js";
import { startBackgroundMusic, toggleBackgroundMusic } from "./audio.js";

export function initEvents({ getState, setState, getUiState, setUiState, rerender }) {
  document.querySelector("#app").addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    const tileId = e.target.closest("[data-tile]")?.dataset.tile;
    const relicId = e.target.closest("[data-relic]")?.dataset.relic;
    const uiState = getUiState();

    if (action !== "toggle-music") {
      startBackgroundMusic({ muted: uiState.isMusicMuted });
    }

    if (tileId) {
      setState(toggleTile(getState(), tileId));
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
        setState(exchangeSelected(getState()));
        rerender();
        break;
      case "submit":
        setState(submitHand(getState()));
        rerender();
        break;
      case "restart":
        setState(newRun());
        rerender();
        break;
      case "start-main":
      case "skip-tutorial":
        setState(newRun());
        rerender();
        break;
      case "start-tutorial":
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
