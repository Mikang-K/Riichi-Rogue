const dragonValues = ["P", "F", "C"];
const windValues = ["E", "S", "W", "N"];

export const tileGroupMatchers = {
  honor: (tile) => tile.suit === "z",
  terminal: (tile) => tile.suit !== "z" && (tile.value === 1 || tile.value === 9),
  simple: (tile) => tile.suit !== "z" && tile.value >= 2 && tile.value <= 8,
  manzu: (tile) => tile.suit === "m",
  pinzu: (tile) => tile.suit === "p",
  souzu: (tile) => tile.suit === "s",
  dragon: (tile) => tile.suit === "z" && dragonValues.includes(tile.value),
  wind: (tile) => tile.suit === "z" && windValues.includes(tile.value),
};

export const augmentEffectHandlers = {
  targetYakuScoreBonus: ({ augment, yaku }) => ({
    yakuScoreBonus: hasTargetYaku(augment, yaku) ? augment.effect.score : 0,
  }),

  targetYakuMultiplierBonus: ({ augment, yaku }) => ({
    yakuMultiplierBonus: hasTargetYaku(augment, yaku) ? augment.effect.multiplier : 0,
  }),

  targetYakuGlobalMultiplierBonus: ({ augment, yaku }) => ({
    globalMultiplierBonus: hasTargetYaku(augment, yaku) ? augment.effect.multiplier : 0,
  }),

  targetTileScoreBonus: ({ augment, tiles }) => ({
    tileScoreBonus: countTargetTiles(augment, tiles) * augment.effect.scorePerTile,
  }),

  targetTileThresholdMultiplierBonus: ({ augment, tiles }) => ({
    tileMultiplierBonus:
      countTargetTiles(augment, tiles) >= augment.effect.threshold ? augment.effect.multiplier : 0,
  }),

  tileGroupScoreBonus: ({ augment, tiles }) => ({
    tileScoreBonus: countGroupTiles(augment, tiles) * augment.effect.scorePerTile,
  }),

  tileGroupThresholdMultiplierBonus: ({ augment, tiles }) => ({
    tileMultiplierBonus:
      countGroupTiles(augment, tiles) >= augment.effect.threshold ? augment.effect.multiplier : 0,
  }),

  doraCountScoreBonus: ({ augment, doraCount }) => ({
    yakuScoreBonus: doraCount * augment.effect.scorePerDora,
  }),

  kanCountScoreBonus: ({ augment, kanCount = 0 }) => ({
    yakuScoreBonus: kanCount * augment.effect.scorePerKan,
  }),
};

function hasTargetYaku(augment, yaku) {
  return augment.target?.type === "yaku" && yaku.some((item) => item.id === augment.target.id);
}

function countTargetTiles(augment, tiles) {
  if (augment.target?.type !== "tileFace") return 0;
  return tiles.filter((tile) => tile.suit === augment.target.suit && tile.value === augment.target.value).length;
}

function countGroupTiles(augment, tiles) {
  if (augment.target?.type !== "tileGroup") return 0;
  const matcher = tileGroupMatchers[augment.target.group];
  return matcher ? tiles.filter(matcher).length : 0;
}
