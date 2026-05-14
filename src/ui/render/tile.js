import { tileName } from "../../game.js";
import { renderTileFace } from "../../tileArt.js";

export function tileButton(tile, selectedIds, riichi = null) {
  const selected = selectedIds.includes(tile.copyId);
  const classes = [
    "tile",
    tile.suit === "z" ? "honor" : tile.suit,
    selected ? "selected" : "",
    riichi?.exchangeTileId === tile.copyId ? "riichi-target" : "",
    riichi?.lastDrawnTile?.copyId === tile.copyId ? "riichi-drawn" : "",
    riichi?.phase === "ready" ? "riichi-ready" : "",
  ].join(" ");
  return `<button class="${classes}" data-tile="${tile.copyId}" aria-label="${tileName(tile)}" aria-pressed="${selected}" title="${tileName(tile)}">${renderTileFace(tile)}</button>`;
}
