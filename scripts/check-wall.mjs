import { newRun, startRound } from "../src/game.js";
import { countTiles, HONORS, keyOf, SUITS } from "../src/game/tile-utils.js";

const expectedFaces = [
  ...SUITS.flatMap((suit) => Array.from({ length: 9 }, (_, index) => `${suit}${index + 1}`)),
  ...HONORS.map((value) => `z${value}`),
];

function collectRoundTiles(state) {
  return [
    ...state.hand,
    ...state.deck,
    ...(state.doraState?.indicators ?? []),
    ...(state.doraState?.uraIndicators ?? []),
    ...(state.deadWall?.rinshanTiles ?? []),
  ];
}

function assertCountsMatch(label, actualTiles, expectedTiles) {
  const actualCounts = countTiles(actualTiles);
  const expectedCounts = countTiles(expectedTiles);
  const keys = new Set([...actualCounts.keys(), ...expectedCounts.keys()]);
  const mismatches = [...keys]
    .sort()
    .filter((key) => (actualCounts.get(key) ?? 0) !== (expectedCounts.get(key) ?? 0))
    .map((key) => `${key}: actual ${actualCounts.get(key) ?? 0}, expected ${expectedCounts.get(key) ?? 0}`);

  if (mismatches.length) {
    throw new Error(`${label} tile counts do not match player tile pool:\n${mismatches.join("\n")}`);
  }
}

function assertDefaultFourCopies(label, tiles) {
  const counts = countTiles(tiles);
  const mismatches = expectedFaces
    .filter((key) => (counts.get(key) ?? 0) !== 4)
    .map((key) => `${key}: ${counts.get(key) ?? 0}`);

  if (mismatches.length) {
    throw new Error(`${label} does not have exactly four copies of every default face:\n${mismatches.join("\n")}`);
  }
}

function assertUniqueCopyIds(label, tiles) {
  const seen = new Set();
  const duplicates = [];
  tiles.forEach((tile) => {
    if (seen.has(tile.copyId)) duplicates.push(`${keyOf(tile)}:${tile.copyId}`);
    seen.add(tile.copyId);
  });

  if (duplicates.length) {
    throw new Error(`${label} contains duplicate copyIds:\n${duplicates.join("\n")}`);
  }
}

function assertRoundShape(label, state) {
  const roundTiles = collectRoundTiles(state);
  assertCountsMatch(label, roundTiles, state.playerTiles);
  assertUniqueCopyIds(label, roundTiles);

  if (state.hand.length !== 14) {
    throw new Error(`${label} expected 14 hand tiles, got ${state.hand.length}`);
  }

  const expectedDeckLength = state.playerTiles.length - state.hand.length - 5 - 5 - 4;
  if (state.deck.length !== expectedDeckLength) {
    throw new Error(`${label} expected live wall length ${expectedDeckLength}, got ${state.deck.length}`);
  }
}

const initial = newRun();
assertDefaultFourCopies("Initial player tile pool", initial.playerTiles);
assertRoundShape("Initial round", initial);

const nextRound = startRound(initial);
assertDefaultFourCopies("Next round player tile pool", nextRound.playerTiles);
assertRoundShape("Next round", nextRound);

for (let index = 0; index < 100; index += 1) {
  assertRoundShape(`Randomized initial round ${index + 1}`, newRun());
}

console.log("Wall checks passed: initial and next rounds use one physical tile pool.");
