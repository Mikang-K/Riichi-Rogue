import { analyzeHand } from "./game/hand-analysis.js";
import { formatWaits, getRiichiState, isRiichiWinningHand } from "./game/riichi.js";
import { evaluateYaku } from "./game/yaku-evaluator.js";
import { HONORS, SUITS, countTiles, sameFace, sortTiles } from "./game/tile-utils.js";

const HONOR_LABELS = { E: "동", S: "남", W: "서", N: "북", P: "백", F: "발", C: "중" };
const SUIT_LABELS = { m: "만", p: "통", s: "삭" };
const TILE_GLYPHS = {
  m: ["", "🀇", "🀈", "🀉", "🀊", "🀋", "🀌", "🀍", "🀎", "🀏"],
  s: ["", "🀐", "🀑", "🀒", "🀓", "🀔", "🀕", "🀖", "🀗", "🀘"],
  p: ["", "🀙", "🀚", "🀛", "🀜", "🀝", "🀞", "🀟", "🀠", "🀡"],
  z: { E: "🀀", S: "🀁", W: "🀂", N: "🀃", C: "🀄", F: "🀅", P: "🀆" },
};

export const rounds = [
  { name: "동 1국", targetScore: 80 },
  { name: "동 2국", targetScore: 105 },
  { name: "동 3국", targetScore: 130 },
  { name: "남입", targetScore: 165 },
  { name: "오라스", targetScore: 210 },
];

export const tutorialRound = { name: "연습국", targetScore: 100 };

const BASE_MAX_DISCARDS = 10;
const TUTORIAL_MAX_DISCARDS = 1;
const HONOR_TILE_SCORE = 10;
const DORA_SCORE = 10;
const LEGACY_HAN_SCORE = 10;
const DEFAULT_MULTIPLIER = 1;
const YAKU_COMPLETION_MULTIPLIER_PER_HAN = 0.25;
const MAX_YAKU_COMPLETION_MULTIPLIER_BONUS = 3;
const RIICHI_YAKU_MULTIPLIER_BONUS = 0.75;
const RIICHI_LEFTOVER_DISCARD_BONUS = 0.1;
const MAX_RIICHI_YAKU_MULTIPLIER_BONUS = 1.5;
export const relicRarities = {
  common: { label: "일반", weight: 70 },
  rare: { label: "희귀", weight: 25 },
  legendary: { label: "전설", weight: 5 },
};

export const relicPool = [
  {
    id: "bamboo-lens",
    name: "대나무 렌즈",
    rarity: "common",
    text: "삭수 슌쯔마다 역 점수 +8점",
    effect: ({ analysis }) => ({
      yakuScoreBonus: analysis.melds.filter((meld) => meld.type === "sequence" && meld.tiles[0].suit === "s").length * 8,
    }),
  },
  {
    id: "red-stick",
    name: "붉은 점봉",
    rarity: "rare",
    text: "커쯔 2개 이상이면 역 점수 +24점",
    effect: ({ analysis }) => ({
      yakuScoreBonus: analysis.melds.filter((meld) => meld.type === "triplet").length >= 2 ? 24 : 0,
    }),
  },
  {
    id: "quiet-ready",
    name: "고요한 리치봉",
    rarity: "rare",
    text: "기본 역이 1개뿐이면 역 배수 +0.5",
    effect: ({ yaku }) => ({ yakuMultiplierBonus: yaku.length === 1 ? 0.5 : 0 }),
  },
  {
    id: "honor-cache",
    name: "자패 금고",
    rarity: "common",
    text: "자패 3장 이상이면 패 점수 +12점",
    effect: ({ tiles }) => ({ tileScoreBonus: tiles.filter((tile) => tile.suit === "z").length >= 3 ? 12 : 0 }),
  },
  {
    id: "clean-brush",
    name: "청색 붓",
    rarity: "common",
    text: "자패가 없으면 패 점수 +14점",
    effect: ({ tiles }) => ({ tileScoreBonus: tiles.every((tile) => tile.suit !== "z") ? 14 : 0 }),
  },
  {
    id: "pair-coin",
    name: "쌍동전",
    rarity: "common",
    text: "또이츠마다 역 점수 +6점",
    effect: ({ counts }) => ({ yakuScoreBonus: [...counts.values()].filter((count) => count >= 2).length * 6 }),
  },
  {
    id: "dora-bell",
    name: "도라 방울",
    rarity: "common",
    text: "도라가 있으면 역 점수 +10점",
    effect: ({ doraHan }) => ({ yakuScoreBonus: doraHan > 0 ? 10 : 0 }),
  },
  {
    id: "dora-mirror",
    name: "도라 거울",
    rarity: "rare",
    text: "도라 1장마다 역 점수 +18점",
    effect: ({ doraCount }) => ({ yakuScoreBonus: doraCount * 18 }),
  },
  {
    id: "same-number",
    name: "삼색 자",
    rarity: "common",
    text: "세 종류에 같은 숫자가 있으면 역 점수 +18점",
    effect: ({ tiles }) => {
      for (let value = 1; value <= 9; value += 1) {
        if (SUITS.every((suit) => tiles.some((tile) => tile.suit === suit && tile.value === value))) return { yakuScoreBonus: 18 };
      }
      return { yakuScoreBonus: 0 };
    },
  },
  {
    id: "terminal-prism",
    name: "노두 프리즘",
    rarity: "common",
    text: "1, 9, 자패마다 패 점수 +3점",
    effect: ({ tiles }) => ({
      tileScoreBonus: tiles.filter((tile) => tile.suit === "z" || tile.value === 1 || tile.value === 9).length * 3,
    }),
  },
  {
    id: "simple-polish",
    name: "중장패 광택제",
    rarity: "rare",
    text: "모든 패가 2~8 수패면 패 배수 +0.45",
    effect: ({ tiles }) => ({
      tileMultiplierBonus: tiles.every((tile) => tile.suit !== "z" && tile.value >= 2 && tile.value <= 8) ? 0.45 : 0,
    }),
  },
  {
    id: "straight-compass",
    name: "일직선 나침반",
    rarity: "rare",
    text: "순자가 3개 이상이면 역 배수 +0.45",
    effect: ({ analysis }) => ({
      yakuMultiplierBonus: analysis.melds.filter((meld) => meld.type === "sequence").length >= 3 ? 0.45 : 0,
    }),
  },
  {
    id: "triplet-drum",
    name: "커쯔 북",
    rarity: "common",
    text: "커쯔마다 역 점수 +10점",
    effect: ({ analysis }) => ({
      yakuScoreBonus: analysis.melds.filter((meld) => meld.type === "triplet").length * 10,
    }),
  },
  {
    id: "flush-lantern",
    name: "일색 등롱",
    rarity: "legendary",
    text: "수패가 한 종류뿐이면 전체 배수 +0.8",
    effect: ({ tiles }) => {
      const suits = new Set(tiles.filter((tile) => tile.suit !== "z").map((tile) => tile.suit));
      return { globalMultiplierBonus: suits.size === 1 ? 0.8 : 0 };
    },
  },
  {
    id: "dragon-seal",
    name: "삼원 봉인",
    rarity: "rare",
    text: "백, 발, 중 커쯔마다 역 점수 +22점",
    effect: ({ analysis }) => ({
      yakuScoreBonus: analysis.melds
        .filter((meld) => meld.type === "triplet" && meld.tiles[0].suit === "z" && ["P", "F", "C"].includes(meld.tiles[0].value))
        .length * 22,
    }),
  },
  {
    id: "yakuman-banner",
    name: "역만 현수막",
    rarity: "legendary",
    text: "역만이면 전체 배수 +1",
    effect: ({ yaku }) => ({
      globalMultiplierBonus: yaku.some((item) => item.yakuman) ? 1 : 0,
    }),
  },
  {
    id: "spare-wall",
    name: "여분의 산",
    rarity: "common",
    text: "매 라운드 교환 횟수 +1",
    player: (player) => ({ ...player, maxDiscards: player.maxDiscards + 1 }),
  },
  {
    id: "heavy-stick",
    name: "무거운 점봉",
    rarity: "legendary",
    text: "매 라운드 교환 횟수 -1, 대신 역 배수 +0.75",
    effect: () => ({ yakuMultiplierBonus: 0.75 }),
    player: (player) => ({ ...player, maxDiscards: Math.max(1, player.maxDiscards - 1) }),
  },
];

export function newRun() {
  const wall = setupWall();
  const hand = sortTiles(draw(wall.liveWall, 14));

  return {
    mode: "main",
    deck: wall.liveWall,
    hand,
    selected: [],
    dora: getVisibleDoraIndicators(wall.doraState)[0],
    doraState: wall.doraState,
    deadWall: wall.deadWall,
    kan: emptyKanState(),
    roundIndex: 0,
    maxDiscards: BASE_MAX_DISCARDS,
    discardsLeft: BASE_MAX_DISCARDS,
    riichi: emptyRiichiState(),
    relics: [],
    coins: 0,
    status: "startReward",
    rewardOptions: getRewardOptions([]),
    message: "시작 유물을 하나 고르세요.",
  };
}

export function newTitle() {
  const doraState = {
    indicators: [fixedTile("m", 1, "title-dora")],
    uraIndicators: [],
    revealedCount: 1,
  };
  return {
    mode: "title",
    deck: [],
    hand: [],
    selected: [],
    dora: getVisibleDoraIndicators(doraState)[0],
    doraState,
    deadWall: emptyDeadWall(),
    kan: emptyKanState(),
    roundIndex: 0,
    maxDiscards: 0,
    discardsLeft: 0,
    riichi: emptyRiichiState(),
    relics: [],
    coins: 0,
    status: "title",
    message: "튜토리얼로 감을 익히거나 바로 본 게임을 시작하세요.",
  };
}

export function newTutorial() {
  const hand = sortTiles([
    fixedTile("m", 2, "t-1"),
    fixedTile("m", 3, "t-2"),
    fixedTile("m", 4, "t-3"),
    fixedTile("p", 2, "t-4"),
    fixedTile("p", 3, "t-5"),
    fixedTile("p", 4, "t-6"),
    fixedTile("s", 3, "t-7"),
    fixedTile("s", 4, "t-8"),
    fixedTile("s", 5, "t-9"),
    fixedTile("m", 6, "t-10"),
    fixedTile("m", 7, "t-11"),
    fixedTile("m", 8, "t-12"),
    fixedTile("p", 6, "t-13"),
    fixedTile("z", "E", "tutorial-discard"),
  ]);

  return {
    mode: "tutorial",
    deck: [fixedTile("p", 6, "tutorial-draw")],
    hand,
    selected: [],
    dora: fixedTile("m", 2, "tutorial-dora"),
    doraState: {
      indicators: [fixedTile("m", 2, "tutorial-dora")],
      uraIndicators: [fixedTile("p", 6, "tutorial-ura-dora")],
      revealedCount: 1,
    },
    deadWall: {
      rinshanTiles: [
        fixedTile("m", 1, "tutorial-rinshan-1"),
        fixedTile("m", 9, "tutorial-rinshan-2"),
        fixedTile("s", 1, "tutorial-rinshan-3"),
        fixedTile("s", 9, "tutorial-rinshan-4"),
      ],
      drawsUsed: 0,
    },
    kan: emptyKanState(),
    roundIndex: 0,
    maxDiscards: TUTORIAL_MAX_DISCARDS,
    discardsLeft: TUTORIAL_MAX_DISCARDS,
    riichi: emptyRiichiState(),
    relics: [relicPool[0]],
    coins: 0,
    status: "tutorial",
    message: "연습 목표: 동을 선택해 교환하면 6통이 들어와 화료할 수 있습니다.",
  };
}

export function startRound(state) {
  const wall = setupWall();
  return {
    ...state,
    mode: "main",
    deck: wall.liveWall,
    hand: sortTiles(draw(wall.liveWall, 14)),
    selected: [],
    dora: getVisibleDoraIndicators(wall.doraState)[0],
    doraState: wall.doraState,
    deadWall: wall.deadWall,
    kan: emptyKanState(),
    discardsLeft: state.maxDiscards,
    riichi: emptyRiichiState(),
    status: "playing",
    message: `${rounds[state.roundIndex].name} 시작.`,
  };
}

export function toggleTile(state, tileId) {
  if (!canAct(state) || state.riichi?.active) return state;
  const selected = state.selected.includes(tileId)
    ? state.selected.filter((id) => id !== tileId)
    : [...state.selected, tileId];
  return { ...state, selected };
}

export function exchangeSelected(state) {
  if (!canAct(state) || state.riichi?.active || state.discardsLeft <= 0 || state.selected.length === 0) return state;
  const keep = state.hand.filter((tile) => !state.selected.includes(tile.copyId));
  const replacements = draw(state.deck, state.selected.length);
  return {
    ...state,
    hand: sortTiles([...keep, ...replacements]),
    selected: [],
    discardsLeft: state.discardsLeft - 1,
    kan: clearRinshanState(state.kan),
    message: state.mode === "tutorial"
      ? "좋아요. 이제 4몸통+1머리 형태가 완성됐습니다. 조합 제출을 눌러 보세요."
      : `${replacements.length}장을 교환했습니다.`,
  };
}

export function declareRiichi(state) {
  if (state.status !== "playing" || state.riichi?.active || state.discardsLeft <= 0) return state;
  const riichiState = getRiichiState(state.hand, state.deck);
  if (!riichiState.canRiichi) {
    return { ...state, selected: [], message: "아직 리치를 선언할 수 없습니다. 한 장 교체로 화료 가능한 형태가 필요합니다." };
  }

  return {
    ...state,
    selected: [],
    riichi: {
      active: true,
      phase: "declared",
      exchangeTileId: riichiState.exchangeTileId,
      waits: riichiState.waits,
      attemptsUsed: 0,
      lastDiscardedTile: null,
      lastDrawnTile: null,
    },
    message: `리치 선언. 대기패: ${formatWaits(riichiState.waits, tileName)}`,
  };
}

export function submitHand(state) {
  if (!canAct(state)) return state;
  if (state.riichi?.active && state.riichi.phase !== "ready") return state;
  const result = scoreHand(getScoringTiles(state), getDoraState(state), state.relics, getScoreContext(state));
  return finishScoredHand(state, result);
}

export function advanceRiichi(state) {
  if (state.status !== "playing" || !["declared", "drawing"].includes(state.riichi?.phase)) return state;
  const exchangeTile = state.hand.find((tile) => tile.copyId === state.riichi.exchangeTileId);
  const replacement = draw(state.deck, 1)[0];
  if (!exchangeTile || !replacement) {
    return failRiichi(state);
  }

  const attemptsUsed = state.riichi.attemptsUsed + 1;
  const hand = sortTiles([...state.hand.filter((tile) => tile.copyId !== exchangeTile.copyId), replacement]);
  const current = {
    ...state,
    hand,
    selected: [],
    discardsLeft: state.discardsLeft - 1,
    kan: clearRinshanState(state.kan),
    riichi: {
      ...state.riichi,
      phase: "drawing",
      exchangeTileId: replacement.copyId,
      attemptsUsed,
      lastDiscardedTile: exchangeTile,
      lastDrawnTile: replacement,
    },
    message: `리치 진행 중... ${attemptsUsed}회째 교체 (${tileName(exchangeTile)} → ${tileName(replacement)})`,
  };

  if (isRiichiWinningHand(current.hand)) {
    return {
      ...current,
      riichi: {
        ...current.riichi,
        phase: "ready",
        exchangeTileId: null,
      },
      message: `리치 성공! ${attemptsUsed}회 교체 끝에 ${tileName(replacement)} 대기로 화료했습니다. 조합 제출을 눌러 점수를 확정하세요.`,
    };
  }

  if (current.discardsLeft <= 0) return failRiichi(current);
  return current;
}

export function getAvailableKans(state) {
  if (!canAct(state) || state.riichi?.active) return [];
  const doraState = getDoraState(state);
  const deadWall = state.deadWall ?? emptyDeadWall();
  if (deadWall.rinshanTiles.length === 0) return [];
  if (doraState.revealedCount >= doraState.indicators.length) return [];

  const counts = countTiles(state.hand);
  return [...counts.entries()]
    .filter(([, count]) => count >= 4)
    .map(([key]) => {
      const tiles = state.hand.filter((tile) => `${tile.suit}${tile.value}` === key);
      return {
        key,
        tile: tiles[0],
        tiles,
      };
    });
}

export function declareKan(state, faceKey) {
  const kan = getAvailableKans(state).find((item) => item.key === faceKey);
  if (!kan) return state;

  const deadWall = state.deadWall ?? emptyDeadWall();
  const rinshanTile = draw(deadWall.rinshanTiles, 1)[0];
  if (!rinshanTile) return state;

  const kanTileIds = new Set(kan.tiles.map((tile) => tile.copyId));
  const hand = sortTiles([
    ...state.hand.filter((tile) => !kanTileIds.has(tile.copyId)),
    rinshanTile,
  ]);
  const nextDoraState = {
    ...getDoraState(state),
    revealedCount: Math.min(getDoraState(state).revealedCount + 1, getDoraState(state).indicators.length),
  };
  const nextKan = {
    ...(state.kan ?? emptyKanState()),
    declaredCount: (state.kan?.declaredCount ?? 0) + 1,
    sets: [...(state.kan?.sets ?? []), { type: "closedKan", tiles: kan.tiles }],
    lastRinshanTileId: rinshanTile.copyId,
    rinshanReady: false,
  };
  const rinshanReady = analyzeHand(getScoringTiles({ ...state, hand, kan: nextKan })).isComplete;

  return {
    ...state,
    hand,
    selected: [],
    dora: getVisibleDoraIndicators(nextDoraState)[0],
    doraState: nextDoraState,
    deadWall: {
      rinshanTiles: deadWall.rinshanTiles,
      drawsUsed: (deadWall.drawsUsed ?? 0) + 1,
    },
    kan: {
      ...nextKan,
      rinshanReady,
    },
    message: rinshanReady
      ? `${tileName(kan.tile)} 깡. 영상패 ${tileName(rinshanTile)}로 화료했습니다. 조합 제출을 눌러 점수를 확정하세요.`
      : `${tileName(kan.tile)} 깡. 영상패 ${tileName(rinshanTile)}를 가져오고 도라가 하나 더 공개되었습니다.`,
  };
}

function failRiichi(state) {
  return {
    ...state,
    status: "lost",
    selected: [],
    riichi: {
      ...state.riichi,
      phase: "failed",
    },
    message: "리치 실패. 남은 교체 횟수 안에 대기패를 가져오지 못했습니다.",
  };
}

function finishScoredHand(state, result, successMessage = null) {
  const targetScore = state.mode === "tutorial" ? tutorialRound.targetScore : rounds[state.roundIndex].targetScore;
  if (result.totalScore < targetScore) {
    if (state.mode === "tutorial") {
      return { ...state, message: `${result.totalScore}점입니다. 연습 목표 ${targetScore}점을 넘기려면 동을 교환한 뒤 제출하세요.` };
    }
    return { ...state, status: "lost", message: `${result.totalScore}점으로 목표 ${targetScore}점에 실패했습니다.` };
  }

  if (state.mode === "tutorial") {
    return {
      ...state,
      status: "tutorialComplete",
      selected: [],
      message: `${result.totalScore}점으로 연습 성공! 이제 본 게임으로 들어갈 수 있습니다.`,
    };
  }

  const nextRoundIndex = state.roundIndex + 1;
  if (nextRoundIndex >= rounds.length) {
    return { ...state, status: "won", coins: state.coins + scoreToCoins(result.totalScore), message: successMessage ?? `최종 ${result.totalScore}점. 완주 성공!` };
  }

  return {
    ...state,
    status: "reward",
    coins: state.coins + scoreToCoins(result.totalScore),
    selected: [],
    rewardOptions: getRewardOptions(state.relics),
    message: successMessage ?? `${result.totalScore}점으로 통과했습니다. 유물을 하나 고르세요.`,
  };
}

export function chooseRelic(state, relicId) {
  const relic = relicPool.find((item) => item.id === relicId);
  if (!["reward", "startReward"].includes(state.status) || !relic) return state;
  const playerState = applyRelicPlayerEffect(state, relic);

  if (state.status === "startReward") {
    return {
      ...playerState,
      relics: [relic],
      rewardOptions: [],
      status: "playing",
      message: `${relic.name}을 들고 ${rounds[state.roundIndex].name}을 시작합니다.`,
    };
  }

  return startRound({
    ...playerState,
    relics: [...playerState.relics, relic],
    roundIndex: state.roundIndex + 1,
    rewardOptions: [],
  });
}

export function scoreHand(tiles, dora, relics = [], context = {}) {
  const counts = countTiles(tiles);
  const analysis = analyzeHand(tiles);
  const yaku = analysis.isComplete ? evaluateYaku(tiles, analysis, context) : [];
  const doraBreakdown = getDoraBreakdown(tiles, dora, context);
  const doraCount = doraBreakdown.totalCount;
  const tileScore = tiles.reduce((sum, tile) => sum + getTileBaseScore(tile), 0);
  const yakuScore = yaku.reduce((sum, item) => sum + item.score, 0);
  const doraScore = analysis.isComplete ? doraCount * DORA_SCORE : 0;
  const totalHan = yaku.reduce((sum, item) => sum + item.han, 0) + (analysis.isComplete ? doraCount : 0);
  const yakuCompletionMultiplier = getYakuCompletionMultiplier(yaku, totalHan);
  const relicBonuses = relics
    .map((relic) => ({ relic, bonus: getRelicScoreBonus(relic, { tiles, analysis, yaku, counts, doraCount, doraHan: doraCount }) }))
    .filter((item) => hasScoreBonus(item.bonus));
  const riichiMultiplierBonus = getRiichiMultiplierBonus(context);
  const bonusTotals = addScoreBonuses(relicBonuses.reduce(addScoreBonuses, emptyScoreBonus()), {
    yakuMultiplierBonus: riichiMultiplierBonus,
  });
  const tileMultiplier = DEFAULT_MULTIPLIER + bonusTotals.tileMultiplierBonus;
  const yakuMultiplier = DEFAULT_MULTIPLIER + bonusTotals.yakuMultiplierBonus;
  const globalMultiplier = yakuCompletionMultiplier + bonusTotals.globalMultiplierBonus;
  const tileScoreTotal = Math.floor((tileScore + bonusTotals.tileScoreBonus) * tileMultiplier);
  const yakuScoreTotal = Math.floor((yakuScore + doraScore + bonusTotals.yakuScoreBonus) * yakuMultiplier);
  const totalScore = Math.floor((tileScoreTotal + yakuScoreTotal) * globalMultiplier);

  return {
    isComplete: analysis.isComplete,
    analysis,
    yaku,
    doraCount,
    doraHan: doraCount,
    doraIndicators: doraBreakdown.doraIndicators,
    uraDoraIndicators: doraBreakdown.uraDoraIndicators,
    regularDoraCount: doraBreakdown.regularCount,
    uraDoraCount: doraBreakdown.uraCount,
    doraScore,
    relicBonuses,
    relicHan: relicBonuses.map(({ relic, bonus }) => ({ relic, han: Math.floor(bonus.yakuScoreBonus / LEGACY_HAN_SCORE) })).filter((item) => item.han > 0),
    tileScore,
    tileScoreBonus: bonusTotals.tileScoreBonus,
    tileMultiplier,
    tileScoreTotal,
    yakuScore,
    yakuScoreBonus: bonusTotals.yakuScoreBonus,
    yakuMultiplier,
    yakuScoreTotal,
    riichiMultiplierBonus,
    yakuCompletionMultiplier,
    globalMultiplier,
    totalScore,
    totalHan,
  };
}

export function getScoringTiles(state) {
  const kanMeldTiles = (state.kan?.sets ?? []).flatMap((set) => set.tiles.slice(0, 3));
  return [...state.hand, ...kanMeldTiles];
}

export function tileLabel(tile) {
  if (tile.suit === "z") return TILE_GLYPHS.z[tile.value];
  return TILE_GLYPHS[tile.suit][tile.value];
}

export function tileName(tile) {
  if (tile.suit === "z") return HONOR_LABELS[tile.value];
  return `${tile.value}${SUIT_LABELS[tile.suit]}`;
}

function getTileBaseScore(tile) {
  return tile.suit === "z" ? HONOR_TILE_SCORE : tile.value;
}

function emptyScoreBonus() {
  return {
    tileScoreBonus: 0,
    yakuScoreBonus: 0,
    tileMultiplierBonus: 0,
    yakuMultiplierBonus: 0,
    globalMultiplierBonus: 0,
  };
}

function addScoreBonuses(total, item) {
  const bonus = item.bonus ?? item;
  return {
    tileScoreBonus: total.tileScoreBonus + (bonus.tileScoreBonus ?? 0),
    yakuScoreBonus: total.yakuScoreBonus + (bonus.yakuScoreBonus ?? 0),
    tileMultiplierBonus: total.tileMultiplierBonus + (bonus.tileMultiplierBonus ?? 0),
    yakuMultiplierBonus: total.yakuMultiplierBonus + (bonus.yakuMultiplierBonus ?? 0),
    globalMultiplierBonus: total.globalMultiplierBonus + (bonus.globalMultiplierBonus ?? 0),
  };
}

function hasScoreBonus(bonus) {
  return Object.values(bonus).some((value) => value !== 0);
}

function getRelicScoreBonus(relic, context) {
  if (relic.effect) return normalizeScoreBonus(relic.effect(context));
  if (!relic.score) return emptyScoreBonus();
  return normalizeScoreBonus({ yakuScoreBonus: relic.score(context) * LEGACY_HAN_SCORE });
}

function normalizeScoreBonus(bonus) {
  return { ...emptyScoreBonus(), ...bonus };
}

function getYakuCompletionMultiplier(yaku, totalHan) {
  if (yaku.length === 0) return DEFAULT_MULTIPLIER;
  const bonus = Math.min(MAX_YAKU_COMPLETION_MULTIPLIER_BONUS, totalHan * YAKU_COMPLETION_MULTIPLIER_PER_HAN);
  return DEFAULT_MULTIPLIER + bonus;
}

function getRiichiMultiplierBonus(context) {
  if (!context.riichi) return 0;
  const leftoverBonus = Math.max(0, context.discardsLeft ?? 0) * RIICHI_LEFTOVER_DISCARD_BONUS;
  return Math.min(MAX_RIICHI_YAKU_MULTIPLIER_BONUS, RIICHI_YAKU_MULTIPLIER_BONUS + leftoverBonus);
}

function getScoreContext(state) {
  const context = {
    rinshan: state.kan?.rinshanReady === true,
  };
  if (!state.riichi?.active) return context;
  return {
    ...context,
    riichi: true,
    includeUraDora: state.riichi.phase === "ready",
    riichiAttemptsUsed: state.riichi.attemptsUsed,
    discardsLeft: state.discardsLeft,
  };
}

function emptyRiichiState() {
  return {
    active: false,
    phase: "idle",
    exchangeTileId: null,
    waits: [],
    attemptsUsed: 0,
    lastDiscardedTile: null,
    lastDrawnTile: null,
  };
}

function emptyKanState() {
  return {
    declaredCount: 0,
    sets: [],
    lastRinshanTileId: null,
    rinshanReady: false,
  };
}

function clearRinshanState(kan = emptyKanState()) {
  return {
    ...kan,
    lastRinshanTileId: null,
    rinshanReady: false,
  };
}

function emptyDeadWall() {
  return {
    rinshanTiles: [],
    drawsUsed: 0,
  };
}

function scoreToCoins(score) {
  return Math.max(1, Math.floor(score / 25));
}

function buildDeck() {
  const faces = [
    ...SUITS.flatMap((suit) => Array.from({ length: 9 }, (_, index) => ({ suit, value: index + 1 }))),
    ...HONORS.map((value) => ({ suit: "z", value })),
  ];
  return faces.flatMap((face) =>
    Array.from({ length: 4 }, (_, copy) => ({
      ...face,
      copyId: `${face.suit}${face.value}-${copy}-${crypto.randomUUID()}`,
    })),
  );
}

function setupWall() {
  const deck = shuffle(buildDeck());
  const doraState = {
    indicators: draw(deck, 5),
    uraIndicators: draw(deck, 5),
    revealedCount: 1,
  };
  return {
    liveWall: deck,
    doraState,
    deadWall: {
      rinshanTiles: draw(deck, 4),
      drawsUsed: 0,
    },
  };
}

function getDoraState(state) {
  if (state?.doraState) return state.doraState;
  if (state?.dora) return getDoraState(state.dora);
  if (Array.isArray(state?.indicators)) return state;
  if (state?.suit && Object.hasOwn(state, "value")) {
    return { indicators: [state], uraIndicators: [], revealedCount: 1 };
  }
  return { indicators: [], uraIndicators: [], revealedCount: 0 };
}

export function getVisibleDoraIndicators(doraInput) {
  const doraState = doraInput?.doraState ? doraInput.doraState : getDoraState(doraInput);
  return doraState.indicators.slice(0, doraState.revealedCount);
}

export function getVisibleUraDoraIndicators(doraInput, context = {}) {
  if (!context.includeUraDora) return [];
  const doraState = doraInput?.doraState ? doraInput.doraState : getDoraState(doraInput);
  return doraState.uraIndicators.slice(0, doraState.revealedCount);
}

function getDoraBreakdown(tiles, doraInput, context) {
  const doraIndicators = getVisibleDoraIndicators(doraInput);
  const uraDoraIndicators = getVisibleUraDoraIndicators(doraInput, context);
  const regularCount = countMatchingDora(tiles, doraIndicators);
  const uraCount = countMatchingDora(tiles, uraDoraIndicators);
  return {
    doraIndicators,
    uraDoraIndicators,
    regularCount,
    uraCount,
    totalCount: regularCount + uraCount,
  };
}

function countMatchingDora(tiles, indicators) {
  return indicators.reduce(
    (sum, indicator) => sum + tiles.filter((tile) => sameFace(tile, indicator)).length,
    0,
  );
}

function fixedTile(suit, value, copyId) {
  return { suit, value, copyId };
}

function applyRelicPlayerEffect(state, relic) {
  if (!relic.player) return state;
  const player = relic.player({ maxDiscards: state.maxDiscards });
  return {
    ...state,
    maxDiscards: player.maxDiscards,
    discardsLeft: Math.min(state.discardsLeft, player.maxDiscards),
  };
}

export function canAct(state) {
  return state.status === "playing" || state.status === "tutorial";
}

export function getAvailableRiichi(state) {
  if (state.status !== "playing" || state.riichi?.active || state.discardsLeft <= 0) {
    return { canRiichi: false, exchangeTileId: null, waits: [] };
  }
  return getRiichiState(state.hand, state.deck);
}

function draw(deck, count) {
  return deck.splice(0, count);
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getRewardOptions(currentRelics) {
  const owned = new Set(currentRelics.map((relic) => relic.id));
  return drawWeightedRelics(relicPool.filter((relic) => !owned.has(relic.id)), 3);
}

function drawWeightedRelics(candidates, count) {
  const options = [];
  const pool = [...candidates];
  while (options.length < count && pool.length > 0) {
    const selected = takeWeightedRelic(pool);
    options.push(selected);
    pool.splice(pool.indexOf(selected), 1);
  }
  return options;
}

function takeWeightedRelic(candidates) {
  const totalWeight = candidates.reduce((sum, relic) => sum + getRelicWeight(relic), 0);
  let roll = Math.random() * totalWeight;
  for (const relic of candidates) {
    roll -= getRelicWeight(relic);
    if (roll <= 0) return relic;
  }
  return candidates.at(-1);
}

function getRelicWeight(relic) {
  return relicRarities[relic.rarity]?.weight ?? relicRarities.common.weight;
}
