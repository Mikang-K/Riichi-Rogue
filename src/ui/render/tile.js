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
    tile.enhancement ? "tile-enhanced" : "",
    options.isDora ? "tile-dora" : "",
    options.isUraDora ? "tile-ura-dora" : "",
    options.isTutorialTarget ? "tutorial-target-active" : "",
  ].join(" ");
  const tutorialTarget = options.tutorialTarget ? ` data-tutorial-target="${options.tutorialTarget}"` : "";
  const badges = [
    tile.enhancement ? `<span class="tile-badge tile-badge-enhance">+${tile.enhancement.tileScoreBonus}</span>` : "",
    options.isDora ? `<span class="tile-badge tile-badge-dora">도라</span>` : "",
    options.isUraDora ? `<span class="tile-badge tile-badge-ura">우라</span>` : "",
  ].filter(Boolean).join("");
  const enhancementTitle = tile.enhancement ? ` ${tile.enhancement.name} +${tile.enhancement.tileScoreBonus}` : "";
  return `<button class="${classes}" data-tile="${tile.copyId}"${tutorialTarget} aria-label="${tileName(tile)}" aria-pressed="${selected}" title="${tileName(tile)}${enhancementTitle}${riichiWaitTitle}">${renderTileFace(tile)}${badges}</button>`;
}
