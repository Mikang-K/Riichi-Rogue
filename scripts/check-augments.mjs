import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { augmentEffectHandlers, tileGroupMatchers } from "../src/game/augment-effects.js";
import { yakuDefinitions } from "../src/game/yaku-data.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const augmentsPath = resolve(__dirname, "../src/data/augments.json");
const augments = JSON.parse(await readFile(augmentsPath, "utf8"));

const rarities = new Set(["common", "rare", "legendary"]);
const targetTypes = new Set(["yaku", "tileFace", "tileGroup"]);
const suits = new Set(["m", "p", "s", "z"]);
const honors = new Set(["E", "S", "W", "N", "P", "F", "C"]);
const yakuIds = new Set(yakuDefinitions.map((item) => item.id));
const tileGroups = new Set(Object.keys(tileGroupMatchers));
const requiredEffectFields = {
  targetYakuScoreBonus: ["score"],
  targetYakuMultiplierBonus: ["multiplier"],
  targetYakuGlobalMultiplierBonus: ["multiplier"],
  targetTileScoreBonus: ["scorePerTile"],
  targetTileThresholdMultiplierBonus: ["threshold", "multiplier"],
  tileGroupScoreBonus: ["scorePerTile"],
  tileGroupThresholdMultiplierBonus: ["threshold", "multiplier"],
};

const errors = [];
const ids = new Set();

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function checkRequiredFields(augment, effect, fields) {
  for (const field of fields) {
    if (!hasValue(effect[field])) errors.push(`${augment.id}: effect.${field} is required`);
  }
}

function checkTileFace(augment) {
  const { suit, value } = augment.target;
  if (!suits.has(suit)) errors.push(`${augment.id}: invalid tile suit "${suit}"`);
  if (suit === "z") {
    if (!honors.has(value)) errors.push(`${augment.id}: invalid honor value "${value}"`);
    return;
  }
  if (!Number.isInteger(value) || value < 1 || value > 9) {
    errors.push(`${augment.id}: suited tile value must be an integer from 1 to 9`);
  }
}

if (!Array.isArray(augments)) {
  errors.push("src/data/augments.json must contain an array");
} else {
  for (const augment of augments) {
    if (!hasValue(augment.id)) {
      errors.push("Augment id is required");
      continue;
    }

    if (ids.has(augment.id)) errors.push(`${augment.id}: duplicate id`);
    ids.add(augment.id);

    if (!hasValue(augment.name)) errors.push(`${augment.id}: name is required`);
    if (!hasValue(augment.text)) errors.push(`${augment.id}: text is required`);
    if (!rarities.has(augment.rarity)) errors.push(`${augment.id}: unknown rarity "${augment.rarity}"`);

    if (!augment.target || !targetTypes.has(augment.target.type)) {
      errors.push(`${augment.id}: unknown target type "${augment.target?.type}"`);
    } else if (augment.target.type === "yaku" && !yakuIds.has(augment.target.id)) {
      errors.push(`${augment.id}: unknown yaku id "${augment.target.id}"`);
    } else if (augment.target.type === "tileFace") {
      checkTileFace(augment);
    } else if (augment.target.type === "tileGroup" && !tileGroups.has(augment.target.group)) {
      errors.push(`${augment.id}: unknown tile group "${augment.target.group}"`);
    }

    if (!augment.effect || !augmentEffectHandlers[augment.effect.type]) {
      errors.push(`${augment.id}: unknown effect type "${augment.effect?.type}"`);
    } else {
      checkRequiredFields(augment, augment.effect, requiredEffectFields[augment.effect.type] ?? []);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${augments.length} augments.`);
}
