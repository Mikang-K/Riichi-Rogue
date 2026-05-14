import {
  DRAGONS,
  WINDS,
  SUITS,
  groupHasTerminal,
  groupHasTerminalOrHonor,
  isDragon,
  isGreen,
  isHonor,
  isSimple,
  isTerminal,
  isTerminalOrHonor,
  meldKey,
  parseKey,
} from "./tile-utils.js";

export const tileYakuRules = [
  ["riichi", ({ riichi }) => Boolean(riichi)],
  ["tanyao", ({ tiles }) => tiles.every(isSimple)],
  ["honroto", ({ tiles }) => tiles.every(isTerminalOrHonor)],
  ["honitsu", ({ tiles }) => hasOneNumberSuit(tiles) && tiles.some(isHonor)],
  ["chinitsu", ({ tiles }) => hasOneNumberSuit(tiles) && tiles.every((tile) => !isHonor(tile))],
  ["kokushiMusou", ({ arrangements }) => arrangements.some((item) => item.type === "kokushi")],
  ["tsuuiiso", ({ tiles }) => tiles.every(isHonor)],
  ["chinroto", ({ tiles }) => tiles.every(isTerminal)],
  ["ryuiso", ({ tiles }) => tiles.every(isGreen)],
  ["churenPoto", ({ tiles }) => hasChurenPoto(tiles)],
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
  ["suanko", ({ standardArrangements }) => standardArrangements.some((item) => triplets(item).length === 4)],
  ["daisangen", ({ standardArrangements }) => standardArrangements.some(hasDaisangen)],
  ["shosushi", ({ standardArrangements }) => standardArrangements.some(hasShosushi)],
  ["daisushi", ({ standardArrangements }) => standardArrangements.some(hasDaisushi)],
];

export const excludedBy = {
  chinitsu: ["honitsu"],
  junchan: ["chanta"],
  ryanpeko: ["iipeko"],
  daisushi: ["shosushi"],
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

function hasDaisangen(arrangement) {
  return DRAGONS.every((dragon) => triplets(arrangement).some((meld) => meld.tiles[0].suit === "z" && meld.tiles[0].value === dragon));
}

function hasShosushi(arrangement) {
  const windTriplets = triplets(arrangement).filter((meld) => meld.tiles[0].suit === "z" && WINDS.includes(meld.tiles[0].value));
  const pair = parseKey(arrangement.pair);
  return windTriplets.length === 3 && pair.suit === "z" && WINDS.includes(pair.value);
}

function hasDaisushi(arrangement) {
  return WINDS.every((wind) => triplets(arrangement).some((meld) => meld.tiles[0].suit === "z" && meld.tiles[0].value === wind));
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

function hasChurenPoto(tiles) {
  const numberTiles = tiles.filter((tile) => !isHonor(tile));
  if (numberTiles.length !== 14 || !hasOneNumberSuit(numberTiles)) return false;

  const counts = new Map();
  numberTiles.forEach((tile) => counts.set(tile.value, (counts.get(tile.value) ?? 0) + 1));

  return (counts.get(1) ?? 0) >= 3
    && (counts.get(9) ?? 0) >= 3
    && [2, 3, 4, 5, 6, 7, 8].every((value) => (counts.get(value) ?? 0) >= 1);
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
