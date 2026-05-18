import { SUITS } from "./tile-utils.js";

const dragonValues = ["P", "F", "C"];

export const relicEffectHandlers = {
  sequenceSuitScoreBonus: ({ relic, analysis }) => ({
    yakuScoreBonus:
      analysis.melds.filter(
        (meld) => meld.type === "sequence" && meld.tiles[0].suit === relic.effect.suit,
      ).length * relic.effect.scorePerSequence,
  }),

  tripletThresholdScoreBonus: ({ relic, analysis }) => ({
    yakuScoreBonus:
      analysis.melds.filter((meld) => meld.type === "triplet").length >= relic.effect.threshold
        ? relic.effect.score
        : 0,
  }),

  singleYakuMultiplierBonus: ({ relic, yaku }) => ({
    yakuMultiplierBonus: yaku.length === 1 ? relic.effect.multiplier : 0,
  }),

  honorTileThresholdScoreBonus: ({ relic, tiles }) => ({
    tileScoreBonus:
      tiles.filter((tile) => tile.suit === "z").length >= relic.effect.threshold ? relic.effect.score : 0,
  }),

  noHonorTileScoreBonus: ({ relic, tiles }) => ({
    tileScoreBonus: tiles.every((tile) => tile.suit !== "z") ? relic.effect.score : 0,
  }),

  pairCountScoreBonus: ({ relic, counts }) => ({
    yakuScoreBonus: [...counts.values()].filter((count) => count >= 2).length * relic.effect.scorePerPair,
  }),

  doraPresenceScoreBonus: ({ relic, doraHan }) => ({
    yakuScoreBonus: doraHan > 0 ? relic.effect.score : 0,
  }),

  doraCountScoreBonus: ({ relic, doraCount }) => ({
    yakuScoreBonus: doraCount * relic.effect.scorePerDora,
  }),

  sameNumberAllSuitsScoreBonus: ({ relic, tiles }) => {
    for (let value = 1; value <= 9; value += 1) {
      if (SUITS.every((suit) => tiles.some((tile) => tile.suit === suit && tile.value === value))) {
        return { yakuScoreBonus: relic.effect.score };
      }
    }
    return { yakuScoreBonus: 0 };
  },

  terminalHonorPerTileScoreBonus: ({ relic, tiles }) => ({
    tileScoreBonus:
      tiles.filter((tile) => tile.suit === "z" || tile.value === 1 || tile.value === 9).length *
      relic.effect.scorePerTile,
  }),

  allSimpleTileMultiplierBonus: ({ relic, tiles }) => ({
    tileMultiplierBonus: tiles.every((tile) => tile.suit !== "z" && tile.value >= 2 && tile.value <= 8)
      ? relic.effect.multiplier
      : 0,
  }),

  sequenceThresholdMultiplierBonus: ({ relic, analysis }) => ({
    yakuMultiplierBonus:
      analysis.melds.filter((meld) => meld.type === "sequence").length >= relic.effect.threshold
        ? relic.effect.multiplier
        : 0,
  }),

  tripletCountScoreBonus: ({ relic, analysis }) => ({
    yakuScoreBonus:
      analysis.melds.filter((meld) => meld.type === "triplet").length * relic.effect.scorePerTriplet,
  }),

  flushGlobalMultiplierBonus: ({ relic, tiles }) => {
    const suits = new Set(tiles.filter((tile) => tile.suit !== "z").map((tile) => tile.suit));
    return { globalMultiplierBonus: suits.size === 1 ? relic.effect.multiplier : 0 };
  },

  dragonTripletScoreBonus: ({ relic, analysis }) => ({
    yakuScoreBonus:
      analysis.melds.filter(
        (meld) =>
          meld.type === "triplet" && meld.tiles[0].suit === "z" && dragonValues.includes(meld.tiles[0].value),
      ).length * relic.effect.scorePerTriplet,
  }),

  yakumanGlobalMultiplierBonus: ({ relic, yaku }) => ({
    globalMultiplierBonus: yaku.some((item) => item.yakuman) ? relic.effect.multiplier : 0,
  }),

  flatYakuMultiplierBonus: ({ relic }) => ({
    yakuMultiplierBonus: relic.effect.multiplier,
  }),
};

export const relicPlayerEffectHandlers = {
  maxDiscardsDelta: ({ relic, player }) => ({
    ...player,
    maxDiscards: Math.max(1, player.maxDiscards + relic.playerEffect.delta),
  }),

  shopEditLimitDelta: ({ relic, player }) => ({
    ...player,
    shopEditLimits: {
      ...player.shopEditLimits,
      [relic.playerEffect.editType]: Math.max(
        0,
        (player.shopEditLimits?.[relic.playerEffect.editType] ?? 0) + relic.playerEffect.delta,
      ),
    },
  }),
};
