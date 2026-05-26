import { newTitle } from "./game.js";
import { getUiState, setUiState } from "./ui/ui-state.js";
import { renderGameView } from "./ui/render/game.js";
import { renderTitleView } from "./ui/render/title.js";
import { initEvents } from "./ui/events.js";
import { loadRunSave, loadStats, recordCompletedRun, saveRunState } from "./game/save.js";

const app = document.querySelector("#app");
let state = newTitle();

function render() {
  const uiState = getUiState();
  app.innerHTML = state.mode === "title"
    ? renderTitleView(uiState, { savedRun: loadRunSave(), stats: loadStats() })
    : renderGameView(state, uiState);
}

function setGameState(nextState) {
  const previousStatus = state.status;
  const isNewTerminal = !["lost", "won"].includes(previousStatus) && ["lost", "won"].includes(nextState.status);
  state = isNewTerminal ? recordCompletedRun(nextState) : nextState;
  saveRunState(state);
}

initEvents({
  getState: () => state,
  setState: setGameState,
  getUiState,
  setUiState,
  rerender: render,
});

render();
