import {
  DRAGONS,
  SUITS,
  groupHasTerminal,
  groupHasTerminalOrHonor,
  isDragon,
  isHonor,
  isSimple,
  isTerminal,
  isTerminalOrHonor,
  meldKey,
  parseKey,
} from "./tile-utils.js";

export const tileYakuRules = [
  ["tanyao", ({ tiles }) => tiles.every(isSimple)],
  ["honroto", ({ tiles }) => tiles.every(isTerminalOrHonor)],
  ["honitsu", ({ tiles }) => hasOneNumberSuit(tiles) && tiles.some(isHonor)],
  ["chinitsu", ({ tiles }) => hasOneNumberSuit(tiles) && tiles.every((tile) => !isHonor(tile))],
];

export const standardYakuRules = [
  ["pinfu", ({ standardArrangements }) => standardArrangements.some(isPinfu)],
  ["toitoi", ({ standardArrangements }) => standardArrangements.some((item) => item.melds.every((meld) => meld.type === "triplet"))],
  ["yakuhai", ({ standardArrangements }) => standardArrangements.some(hasDragonTriplet)],
  ["sanshokuDoujun", ({ standardArrangements }) => standardArrangements.some(hasSanshokuDoujun)],
  ["ittsu", ({ standardArrangements }) => standardArrangements.some(hasIttsu)],
  ["sanshokuDouko", ({ standardArrangements }) => standardArrangements.some(hasSanshokuDouko)],
  ["sananko", ({ standardArrangements }) => standardArrangements.some((item) => triplets(item).length >= 3)],
  ["shosangen", ({ standardArrangements }) => standardArrangements.some(hasShosangen)],
  ["honroto", ({ tiles }) => tiles.every(isTerminalOrHonor)],
  ["chanta", ({ standardArrangements }) => standardArrangements.some(isChanta)],
  ["junchan", ({ standardArrangements }) => standardArrangements.some(isJunchan)],
  ["iipeko", ({ standardArrangements }) => standardArrangements.some((item) => sequencePairCount(item) >= 1)],
  ["ryanpeko", ({ standardArrangements }) => standardArrangements.some((item) => sequencePairCount(item) >= 2)],
];

export const excludedBy = {
  chinitsu: ["honitsu"],
  junchan: ["chanta"],
  ryanpeko: ["iipeko"],
};

function isPinfu(arrangement) {
  return arrangement.melds.every((meld) => meld.type === "sequence") && !parseKey(arrangement.pair).suit.startsWith("z");
}

function hasDragonTriplet(arrangement) {
  return triplets(arrangement).some((meld) => isDragon(meld.tiles[0]));
}

function hasSanshokuDoujun(arrangement) {
  for (let start = 1; start <= 7; start += 1) {
    if (SUITS.every((suit) => arrangement.melds.some((meld) => isSequence(meld, suit, start)))) return true;
  }
  return false;
}

function hasIttsu(arrangement) {
  return SUITS.some((suit) => [1, 4, 7].every((start) => arrangement.melds.some((meld) => isSequence(meld, suit, start))));
}

function hasSanshokuDouko(arrangement) {
  for (let value = 1; value <= 9; value += 1) {
    if (SUITS.every((suit) => triplets(arrangement).some((meld) => meld.tiles[0].suit === suit && meld.tiles[0].value === value))) {
      return true;
    }
  }
  return false;
}

function hasShosangen(arrangement) {
  const dragonTriplets = triplets(arrangement).filter((meld) => isDragon(meld.tiles[0]));
  const pair = parseKey(arrangement.pair);
  return dragonTriplets.length === 2 && pair.suit === "z" && DRAGONS.includes(pair.value);
}

function isChanta(arrangement) {
  const groups = [...arrangement.melds, pairGroup(arrangement.pair)];
  return arrangement.melds.some((meld) => meld.type === "sequence")
    && groups.every(groupHasTerminalOrHonor);
}

function isJunchan(arrangement) {
  const groups = [...arrangement.melds, pairGroup(arrangement.pair)];
  return arrangement.melds.some((meld) => meld.type === "sequence")
    && groups.every(groupHasTerminal)
    && groups.every((group) => group.tiles.every((tile) => !isHonor(tile)));
}

function sequencePairCount(arrangement) {
  const counts = new Map();
  arrangement.melds
    .filter((meld) => meld.type === "sequence")
    .forEach((meld) => counts.set(meldKey(meld), (counts.get(meldKey(meld)) ?? 0) + 1));
  return [...counts.values()].filter((count) => count >= 2).length;
}

function hasOneNumberSuit(tiles) {
  const suits = new Set(tiles.filter((tile) => !isHonor(tile)).map((tile) => tile.suit));
  return suits.size === 1;
}

function triplets(arrangement) {
  return arrangement.melds.filter((meld) => meld.type === "triplet");
}

function isSequence(meld, suit, start) {
  return meld.type === "sequence" && meld.tiles[0].suit === suit && meld.tiles[0].value === start;
}

function pairGroup(pairKey) {
  const tile = parseKey(pairKey);
  return { type: "pair", tiles: [tile, tile] };
}
