import { analyzeHand } from "./hand-analysis.js";
import { HONORS, SUITS, countTiles, keyOf, sameFace, sortTiles } from "./tile-utils.js";

const WAIT_FACES = [
  ...SUITS.flatMap((suit) => Array.from({ length: 9 }, (_, index) => ({ suit, value: index + 1 }))),
  ...HONORS.map((value) => ({ suit: "z", value })),
];

export function getRiichiState(hand, availableTiles = null) {
  const candidates = findRiichiCandidates(hand, availableTiles);
  const best = candidates[0];
  if (!best) return { canRiichi: false, exchangeTileId: null, waits: [], candidates: [] };

  return {
    canRiichi: true,
    exchangeTileId: best.exchangeTileId,
    waits: best.waits,
    candidates,
  };
}

export function findRiichiCandidates(hand, availableTiles = null) {
  const availableCounts = availableTiles ? countTiles(availableTiles) : null;
  return hand
    .map((tile) => getRiichiCandidate(hand, tile, availableCounts))
    .filter((candidate) => candidate.waits.length > 0)
    .sort(compareRiichiCandidates);
}

export function isRiichiWinningHand(hand) {
  return analyzeHand(hand).isComplete;
}

export function formatWaits(waits, tileName) {
  if (!waits.length) return "";
  return waits.map(tileName).join(", ");
}

function getRiichiCandidate(hand, exchangeTile, availableCounts) {
  const keep = hand.filter((tile) => tile.copyId !== exchangeTile.copyId);
  const waits = WAIT_FACES
    .filter((face) => !availableCounts || (availableCounts.get(keyOf(face)) ?? 0) > 0)
    .filter((face) => isRiichiWinningHand(sortTiles([...keep, makePreviewTile(face)])));
  const uniqueWaits = dedupeFaces(waits);
  return {
    exchangeTileId: exchangeTile.copyId,
    exchangeTile,
    waits: uniqueWaits,
    waitCount: uniqueWaits.length,
  };
}

function makePreviewTile(face) {
  return { ...face, copyId: `riichi-preview-${keyOf(face)}` };
}

function dedupeFaces(faces) {
  const unique = [];
  faces.forEach((face) => {
    if (!unique.some((item) => sameFace(item, face))) unique.push(face);
  });
  return unique;
}

function compareRiichiCandidates(a, b) {
  return b.waits.length - a.waits.length;
}
