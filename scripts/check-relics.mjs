import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { relicEffectHandlers, relicPlayerEffectHandlers } from "../src/game/relic-effects.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const relicsPath = resolve(__dirname, "../src/data/relics.json");
const relics = JSON.parse(await readFile(relicsPath, "utf8"));

const relicRarities = new Set(["common", "rare", "legendary"]);
const requiredEffectFields = {
  sequenceSuitScoreBonus: ["suit", "scorePerSequence"],
  tripletThresholdScoreBonus: ["threshold", "score"],
  singleYakuMultiplierBonus: ["multiplier"],
  honorTileThresholdScoreBonus: ["threshold", "score"],
  noHonorTileScoreBonus: ["score"],
  pairCountScoreBonus: ["scorePerPair"],
  doraPresenceScoreBonus: ["score"],
  doraCountScoreBonus: ["scorePerDora"],
  sameNumberAllSuitsScoreBonus: ["score"],
  terminalHonorPerTileScoreBonus: ["scorePerTile"],
  allSimpleTileMultiplierBonus: ["multiplier"],
  sequenceThresholdMultiplierBonus: ["threshold", "multiplier"],
  tripletCountScoreBonus: ["scorePerTriplet"],
  flushGlobalMultiplierBonus: ["multiplier"],
  dragonTripletScoreBonus: ["scorePerTriplet"],
  yakumanGlobalMultiplierBonus: ["multiplier"],
  flatYakuMultiplierBonus: ["multiplier"],
};
const requiredPlayerEffectFields = {
  maxDiscardsDelta: ["delta"],
};

const errors = [];
const ids = new Set();

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function checkRequiredFields(relic, effect, fields, label) {
  for (const field of fields) {
    if (!hasValue(effect[field])) errors.push(`${relic.id}: ${label}.${field} is required`);
  }
}

if (!Array.isArray(relics)) {
  errors.push("src/data/relics.json must contain an array");
} else {
  for (const relic of relics) {
    if (!hasValue(relic.id)) {
      errors.push("Relic id is required");
      continue;
    }

    if (ids.has(relic.id)) errors.push(`${relic.id}: duplicate id`);
    ids.add(relic.id);

    if (!hasValue(relic.name)) errors.push(`${relic.id}: name is required`);
    if (!hasValue(relic.text)) errors.push(`${relic.id}: text is required`);
    if (!relicRarities.has(relic.rarity)) errors.push(`${relic.id}: unknown rarity "${relic.rarity}"`);

    if (relic.effect) {
      if (!relicEffectHandlers[relic.effect.type]) {
        errors.push(`${relic.id}: unknown effect type "${relic.effect.type}"`);
      } else {
        checkRequiredFields(relic, relic.effect, requiredEffectFields[relic.effect.type] ?? [], "effect");
      }
    }

    if (relic.playerEffect) {
      if (!relicPlayerEffectHandlers[relic.playerEffect.type]) {
        errors.push(`${relic.id}: unknown playerEffect type "${relic.playerEffect.type}"`);
      } else {
        checkRequiredFields(
          relic,
          relic.playerEffect,
          requiredPlayerEffectFields[relic.playerEffect.type] ?? [],
          "playerEffect",
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${relics.length} relics.`);
}
