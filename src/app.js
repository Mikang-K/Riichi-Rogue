import { newTitle } from "./game.js";
import { getUiState, setUiState } from "./ui/ui-state.js";
import { renderGameView } from "./ui/render/game.js";
import { renderTitleView } from "./ui/render/title.js";
import { initEvents } from "./ui/events.js";

const app = document.querySelector("#app");
let state = newTitle();

function render() {
  const uiState = getUiState();
  app.innerHTML = state.mode === "title"
    ? renderTitleView(uiState)
    : renderGameView(state, uiState);
}

initEvents({
  getState: () => state,
  setState: (s) => { state = s; },
  getUiState,
  setUiState,
  rerender: render,
});

render();
