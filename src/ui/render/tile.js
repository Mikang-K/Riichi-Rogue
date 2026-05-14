import { tileName } from "../../game.js";
import { renderTileFace } from "../../tileArt.js";

export function tileButton(tile, selectedIds, riichi = null, kan = null, kanCandidateKeys = new Set()) {
  const selected = selectedIds.includes(tile.copyId);
  const faceKey = `${tile.suit}${tile.value}`;
  const classes = [
    "tile",
    tile.suit === "z" ? "honor" : tile.suit,
    selected ? "selected" : "",
    kanCandidateKeys.has(faceKey) ? "kan-candidate" : "",
    riichi?.exchangeTileId === tile.copyId ? "riichi-target" : "",
    riichi?.lastDrawnTile?.copyId === tile.copyId ? "riichi-drawn" : "",
    riichi?.phase === "ready" ? "riichi-ready" : "",
    kan?.lastRinshanTileId === tile.copyId ? "riichi-drawn" : "",
  ].join(" ");
  return `<button class="${classes}" data-tile="${tile.copyId}" aria-label="${tileName(tile)}" aria-pressed="${selected}" title="${tileName(tile)}">${renderTileFace(tile)}</button>`;
}
