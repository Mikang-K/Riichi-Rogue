const SUITS = ["m", "p", "s"];
const HONORS = ["E", "S", "W", "N", "P", "F", "C"];
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
const YAKU_SCORE_BY_NAME = {
  칠대자: 24,
  탕야오: 10,
  핑후: 12,
  또이또이: 30,
  혼일색: 42,
  청일색: 80,
  역패: 12,
  삼색동순: 28,
};

export const relicPool = [
  {
    id: "bamboo-lens",
    name: "대나무 렌즈",
    text: "삭수 슌쯔마다 +1판",
    score: ({ analysis }) => analysis.melds.filter((meld) => meld.type === "sequence" && meld.tiles[0].suit === "s").length,
  },
  {
    id: "red-stick",
    name: "붉은 점봉",
    text: "커쯔 2개 이상이면 +2판",
    score: ({ analysis }) => (analysis.melds.filter((meld) => meld.type === "triplet").length >= 2 ? 2 : 0),
  },
  {
    id: "quiet-ready",
    name: "고요한 리치봉",
    text: "기본 역이 1개뿐이면 +2판",
    score: ({ yaku }) => (yaku.length === 1 ? 2 : 0),
  },
  {
    id: "honor-cache",
    name: "자패 금고",
    text: "자패 3장 이상이면 +1판",
    score: ({ tiles }) => (tiles.filter((tile) => tile.suit === "z").length >= 3 ? 1 : 0),
  },
  {
    id: "clean-brush",
    name: "청색 붓",
    text: "자패가 없으면 +1판",
    score: ({ tiles }) => (tiles.every((tile) => tile.suit !== "z") ? 1 : 0),
  },
  {
    id: "pair-coin",
    name: "쌍동전",
    text: "또이츠마다 +1판",
    score: ({ counts }) => [...counts.values()].filter((count) => count >= 2).length,
  },
  {
    id: "dora-bell",
    name: "도라 방울",
    text: "도라 보너스 +1판",
    score: ({ doraHan }) => (doraHan > 0 ? 1 : 0),
  },
  {
    id: "same-number",
    name: "삼색 자",
    text: "세 종류에 같은 숫자가 있으면 +2판",
    score: ({ tiles }) => {
      for (let value = 1; value <= 9; value += 1) {
        if (SUITS.every((suit) => tiles.some((tile) => tile.suit === suit && tile.value === value))) return 2;
      }
      return 0;
    },
  },
  {
    id: "spare-wall",
    name: "여분의 산",
    text: "매 라운드 교환 횟수 +1",
    score: () => 0,
    player: (player) => ({ ...player, maxDiscards: player.maxDiscards + 1 }),
  },
  {
    id: "heavy-stick",
    name: "무거운 점봉",
    text: "매 라운드 교환 횟수 -1, 대신 조합 점수 +2판",
    score: () => 2,
    player: (player) => ({ ...player, maxDiscards: Math.max(1, player.maxDiscards - 1) }),
  },
];

export function newRun() {
  const deck = shuffle(buildDeck());
  const dora = draw(deck, 1)[0];
  const hand = sortTiles(draw(deck, 14));

  return {
    mode: "main",
    deck,
    hand,
    selected: [],
    dora,
    roundIndex: 0,
    maxDiscards: BASE_MAX_DISCARDS,
    discardsLeft: BASE_MAX_DISCARDS,
    relics: [relicPool[0]],
    coins: 0,
    status: "playing",
    message: "패를 골라 교환하거나, 완성 조합이면 제출하세요.",
  };
}

export function newTitle() {
  return {
    mode: "title",
    deck: [],
    hand: [],
    selected: [],
    dora: fixedTile("m", 1, "title-dora"),
    roundIndex: 0,
    maxDiscards: 0,
    discardsLeft: 0,
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
    roundIndex: 0,
    maxDiscards: TUTORIAL_MAX_DISCARDS,
    discardsLeft: TUTORIAL_MAX_DISCARDS,
    relics: [relicPool[0]],
    coins: 0,
    status: "tutorial",
    message: "연습 목표: 동을 선택해 교환하면 6통이 들어와 화료할 수 있습니다.",
  };
}

export function startRound(state) {
  const deck = shuffle(buildDeck());
  const dora = draw(deck, 1)[0];
  return {
    ...state,
    mode: "main",
    deck,
    hand: sortTiles(draw(deck, 14)),
    selected: [],
    dora,
    discardsLeft: state.maxDiscards,
    status: "playing",
    message: `${rounds[state.roundIndex].name} 시작.`,
  };
}

export function toggleTile(state, tileId) {
  if (!canAct(state)) return state;
  const selected = state.selected.includes(tileId)
    ? state.selected.filter((id) => id !== tileId)
    : [...state.selected, tileId];
  return { ...state, selected };
}

export function exchangeSelected(state) {
  if (!canAct(state) || state.discardsLeft <= 0 || state.selected.length === 0) return state;
  const keep = state.hand.filter((tile) => !state.selected.includes(tile.copyId));
  const replacements = draw(state.deck, state.selected.length);
  return {
    ...state,
    hand: sortTiles([...keep, ...replacements]),
    selected: [],
    discardsLeft: state.discardsLeft - 1,
    message: state.mode === "tutorial"
      ? "좋아요. 이제 4몸통+1머리 형태가 완성됐습니다. 조합 제출을 눌러 보세요."
      : `${replacements.length}장을 교환했습니다.`,
  };
}

export function submitHand(state) {
  if (!canAct(state)) return state;
  const result = scoreHand(state.hand, state.dora, state.relics);
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
    return { ...state, status: "won", coins: state.coins + scoreToCoins(result.totalScore), message: `최종 ${result.totalScore}점. 완주 성공!` };
  }

  return {
    ...state,
    status: "reward",
    coins: state.coins + scoreToCoins(result.totalScore),
    selected: [],
    rewardOptions: getRewardOptions(state.relics),
    message: `${result.totalScore}점으로 통과했습니다. 유물을 하나 고르세요.`,
  };
}

export function chooseRelic(state, relicId) {
  const relic = relicPool.find((item) => item.id === relicId);
  if (state.status !== "reward" || !relic) return state;
  const playerState = applyRelicPlayerEffect(state, relic);
  return startRound({
    ...playerState,
    relics: [...playerState.relics, relic],
    roundIndex: state.roundIndex + 1,
    rewardOptions: [],
  });
}

export function scoreHand(tiles, dora, relics) {
  const counts = countTiles(tiles);
  const analysis = analyzeHand(tiles);
  const yaku = analysis.isComplete ? getYaku(tiles, analysis) : [];
  const doraCount = tiles.filter((tile) => sameFace(tile, dora)).length;
  const tileScore = tiles.reduce((sum, tile) => sum + getTileBaseScore(tile), 0);
  const yakuScore = yaku.reduce((sum, item) => sum + item.score, 0);
  const doraScore = analysis.isComplete ? doraCount * DORA_SCORE : 0;
  const totalHan = yaku.reduce((sum, item) => sum + item.han, 0) + (analysis.isComplete ? doraCount : 0);
  const relicBonuses = relics
    .map((relic) => ({ relic, bonus: getRelicScoreBonus(relic, { tiles, analysis, yaku, counts, doraCount, doraHan: doraCount }) }))
    .filter((item) => hasScoreBonus(item.bonus));
  const bonusTotals = relicBonuses.reduce(addScoreBonuses, emptyScoreBonus());
  const tileMultiplier = DEFAULT_MULTIPLIER + bonusTotals.tileMultiplierBonus;
  const yakuMultiplier = DEFAULT_MULTIPLIER + bonusTotals.yakuMultiplierBonus;
  const globalMultiplier = DEFAULT_MULTIPLIER + bonusTotals.globalMultiplierBonus;
  const tileScoreTotal = Math.floor((tileScore + bonusTotals.tileScoreBonus) * tileMultiplier);
  const yakuScoreTotal = Math.floor((yakuScore + doraScore + bonusTotals.yakuScoreBonus) * yakuMultiplier);
  const totalScore = Math.floor((tileScoreTotal + yakuScoreTotal) * globalMultiplier);

  return {
    isComplete: analysis.isComplete,
    analysis,
    yaku,
    doraCount,
    doraHan: doraCount,
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
    globalMultiplier,
    totalScore,
    totalHan,
  };
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

function canAct(state) {
  return state.status === "playing" || state.status === "tutorial";
}

function draw(deck, count) {
  return deck.splice(0, count);
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function sortTiles(tiles) {
  const suitOrder = { m: 0, p: 1, s: 2, z: 3 };
  return [...tiles].sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit] || compareValue(a.value, b.value));
}

function compareValue(a, b) {
  const order = { E: 1, S: 2, W: 3, N: 4, P: 5, F: 6, C: 7 };
  return (order[a] ?? a) - (order[b] ?? b);
}

function keyOf(tile) {
  return `${tile.suit}${tile.value}`;
}

function sameFace(a, b) {
  return a.suit === b.suit && a.value === b.value;
}

function countTiles(tiles) {
  const counts = new Map();
  tiles.forEach((tile) => counts.set(keyOf(tile), (counts.get(keyOf(tile)) ?? 0) + 1));
  return counts;
}

function analyzeHand(tiles) {
  const counts = countTiles(tiles);
  const pairs = [...counts.values()].filter((count) => count === 2).length;
  if (tiles.length === 14 && pairs === 7) {
    return { isComplete: true, type: "sevenPairs", melds: [], pair: null };
  }

  const faces = [...counts.keys()];
  for (const pairKey of faces) {
    if ((counts.get(pairKey) ?? 0) < 2) continue;
    const nextCounts = new Map(counts);
    nextCounts.set(pairKey, nextCounts.get(pairKey) - 2);
    const melds = findMelds(nextCounts);
    if (melds) return { isComplete: true, type: "standard", melds, pair: pairKey };
  }

  return { isComplete: false, type: "none", melds: [], pair: null };
}

function findMelds(counts, melds = []) {
  const current = [...counts.entries()].find(([, count]) => count > 0);
  if (!current) return melds;

  const [key, count] = current;
  const tile = parseKey(key);
  if (count >= 3) {
    const tripletCounts = new Map(counts);
    tripletCounts.set(key, count - 3);
    const tripletResult = findMelds(tripletCounts, [...melds, { type: "triplet", tiles: [tile, tile, tile] }]);
    if (tripletResult) return tripletResult;
  }

  if (tile.suit !== "z" && tile.value <= 7) {
    const keys = [key, `${tile.suit}${tile.value + 1}`, `${tile.suit}${tile.value + 2}`];
    if (keys.every((item) => (counts.get(item) ?? 0) > 0)) {
      const sequenceCounts = new Map(counts);
      keys.forEach((item) => sequenceCounts.set(item, sequenceCounts.get(item) - 1));
      const sequenceResult = findMelds(sequenceCounts, [
        ...melds,
        { type: "sequence", tiles: keys.map(parseKey) },
      ]);
      if (sequenceResult) return sequenceResult;
    }
  }

  return null;
}

function parseKey(key) {
  const suit = key[0];
  const raw = key.slice(1);
  return { suit, value: suit === "z" ? raw : Number(raw) };
}

function getYaku(tiles, analysis) {
  const yaku = [];
  const suits = new Set(tiles.filter((tile) => tile.suit !== "z").map((tile) => tile.suit));
  const hasHonor = tiles.some((tile) => tile.suit === "z");
  const addYaku = (name, han) => yaku.push({ name, han, score: YAKU_SCORE_BY_NAME[name] ?? han * LEGACY_HAN_SCORE });

  if (analysis.type === "sevenPairs") addYaku("칠대자", 2);
  if (tiles.every((tile) => tile.suit !== "z" && tile.value >= 2 && tile.value <= 8)) addYaku("탕야오", 1);
  if (analysis.type === "standard" && analysis.melds.every((meld) => meld.type === "sequence") && !String(analysis.pair).startsWith("z")) {
    addYaku("핑후", 1);
  }
  if (analysis.type === "standard" && analysis.melds.every((meld) => meld.type === "triplet")) addYaku("또이또이", 2);
  if (suits.size === 1 && hasHonor) addYaku("혼일색", 3);
  if (suits.size === 1 && !hasHonor) addYaku("청일색", 6);
  if (analysis.melds.some((meld) => meld.type === "triplet" && meld.tiles[0].suit === "z" && ["P", "F", "C"].includes(meld.tiles[0].value))) {
    addYaku("역패", 1);
  }
  if (hasSanshoku(analysis.melds)) addYaku("삼색동순", 2);

  return yaku;
}

function hasSanshoku(melds) {
  for (let start = 1; start <= 7; start += 1) {
    if (SUITS.every((suit) => melds.some((meld) => meld.type === "sequence" && meld.tiles[0].suit === suit && meld.tiles[0].value === start))) {
      return true;
    }
  }
  return false;
}

function getRewardOptions(currentRelics) {
  const owned = new Set(currentRelics.map((relic) => relic.id));
  return shuffle(relicPool.filter((relic) => !owned.has(relic.id))).slice(0, 3);
}
