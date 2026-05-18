import { tileName } from "../../game.js";
import { renderTileFace } from "../../tileArt.js";

export function tileButton(
  tile,
  selectedIds,
  riichi = null,
  kan = null,
  kanCandidateKeys = new Set(),
  riichiCandidates = [],
  options = {},
) {
  const selected = selectedIds.includes(tile.copyId);
  const faceKey = `${tile.suit}${tile.value}`;
  const riichiCandidate = riichiCandidates.find((candidate) => candidate.exchangeTileId === tile.copyId);
  const isSelectingRiichi = riichi?.phase === "selectingDiscard";
  const riichiWaitTitle = riichiCandidate ? ` 대기패: ${riichiCandidate.waits.map(tileName).join(", ")}` : "";
  const classes = [
    "tile",
    tile.suit === "z" ? "honor" : tile.suit,
    selected ? "selected" : "",
    kanCandidateKeys.has(faceKey) ? "kan-candidate" : "",
    riichiCandidate ? "riichi-candidate" : "",
    isSelectingRiichi && !riichiCandidate ? "riichi-non-candidate" : "",
    riichi?.exchangeTileId === tile.copyId ? "riichi-target" : "",
    riichi?.lastDrawnTile?.copyId === tile.copyId ? "riichi-drawn" : "",
    riichi?.phase === "ready" ? "riichi-ready" : "",
    kan?.lastRinshanTileId === tile.copyId ? "riichi-drawn" : "",
    options.isTutorialTarget ? "tutorial-target-active" : "",
  ].join(" ");
  const tutorialTarget = options.tutorialTarget ? ` data-tutorial-target="${options.tutorialTarget}"` : "";
  return `<button class="${classes}" data-tile="${tile.copyId}"${tutorialTarget} aria-label="${tileName(tile)}" aria-pressed="${selected}" title="${tileName(tile)}${riichiWaitTitle}">${renderTileFace(tile)}</button>`;
}
