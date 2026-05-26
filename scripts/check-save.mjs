import {
  chooseReward,
  newRun,
  rerollShop,
  submitHand,
  toggleShopOfferLock,
} from "../src/game.js";
import {
  RUN_SAVE_KEY,
  STATS_SAVE_KEY,
  loadRunSave,
  loadStats,
  recordCompletedRun,
  restoreSavedState,
  saveRunState,
} from "../src/game/save.js";

const storage = createMemoryStorage();

const seededA = newRun("TEST-SEED");
const seededB = newRun("TEST-SEED");
assertEqual("Seeded rewards", seededA.rewardOptions.map((item) => item.id), seededB.rewardOptions.map((item) => item.id));
assertEqual("Seeded hand", summarizeFaces(seededA.hand), summarizeFaces(seededB.hand));
assertEqual("Seeded dora", summarizeFaces(seededA.doraState.indicators), summarizeFaces(seededB.doraState.indicators));

if (!saveRunState(seededA, storage)) {
  throw new Error("Expected main run state to be saved.");
}

const saved = loadRunSave(storage);
const restored = restoreSavedState(saved);
if (!restored || restored.status !== seededA.status || restored.mode !== "main") {
  throw new Error("Saved run did not restore to a valid main state.");
}

assertUniqueCopyIds("Restored round", [
  ...restored.hand,
  ...restored.deck,
  ...(restored.doraState?.indicators ?? []),
  ...(restored.doraState?.uraIndicators ?? []),
  ...(restored.deadWall?.rinshanTiles ?? []),
]);

const playing = chooseReward(seededA, seededA.rewardOptions[0].id);
const readyToScore = {
  ...playing,
  hand: parseHand("111m 222m 333m 444m 55m"),
  selected: [],
};
const shopState = submitHand(readyToScore);
if (shopState.status !== "shop" || !shopState.shop || shopState.run.roundReports.length !== 1) {
  throw new Error("Expected a cleared round to enter shop and append one report.");
}

const firstOffer = shopState.shop.offers.relics[0] ?? shopState.shop.offers.augments[0];
const locked = toggleShopOfferLock(shopState, firstOffer.id);
if (!locked.shop.lockedOfferIds.includes(firstOffer.id)) {
  throw new Error("Expected shop offer to be locked.");
}

const rerolled = rerollShop({ ...locked, coins: Math.max(locked.coins, locked.shop.rerollPrice) });
if (!rerolled.shop.lockedOfferIds.includes(firstOffer.id)) {
  throw new Error("Expected locked offer to remain locked after reroll.");
}
if (!rerolled.shop.offers.relics.some((offer) => offer.id === firstOffer.id)
  && !rerolled.shop.offers.augments.some((offer) => offer.id === firstOffer.id)) {
  throw new Error("Expected locked offer to remain in the shop after reroll.");
}
if (rerolled.shop.rerollPrice <= locked.shop.rerollPrice) {
  throw new Error("Expected reroll price to increase.");
}

const terminal = recordCompletedRun({ ...shopState, status: "won" }, storage);
if (!terminal.run.recordedAt) {
  throw new Error("Expected completed run to be marked as recorded.");
}
const stats = loadStats(storage);
if (stats.totalRuns !== 1 || stats.wins !== 1 || stats.recentRuns.length !== 1) {
  throw new Error("Expected completed run stats to be recorded exactly once.");
}

if (!storage.getItem(RUN_SAVE_KEY) || !storage.getItem(STATS_SAVE_KEY)) {
  throw new Error("Expected run and stats keys to be present in storage.");
}

console.log("Save checks passed: persistence, seeded start, reports, stats, and shop reroll.");

function summarizeFaces(tiles) {
  return tiles.map((tile) => `${tile.suit}${tile.value}`);
}

function assertEqual(label, actual, expected) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`${label} mismatch:\nactual ${actualText}\nexpected ${expectedText}`);
  }
}

function assertUniqueCopyIds(label, tiles) {
  const seen = new Set();
  const duplicates = [];
  tiles.forEach((tile) => {
    if (seen.has(tile.copyId)) duplicates.push(tile.copyId);
    seen.add(tile.copyId);
  });
  if (duplicates.length) {
    throw new Error(`${label} contains duplicate copyIds:\n${duplicates.join("\n")}`);
  }
}

function parseHand(text) {
  let index = 0;
  return text.trim().split(/\s+/).flatMap((group) => {
    const suit = group.at(-1);
    return [...group.slice(0, -1)].map((value) => ({
      suit,
      value: suit === "z" ? value : Number(value),
      copyId: `save-test-${index++}`,
    }));
  });
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}
