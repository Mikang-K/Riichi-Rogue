import { analyzeHand } from "./game/hand-analysis.js";
import { augmentPool, augmentRarities } from "./game/augments.js";
import { formatWaits, getRiichiState, isRiichiWinningHand } from "./game/riichi.js";
import { relicPool, relicRarities } from "./game/relics.js";
import { evaluateYaku } from "./game/yaku-evaluator.js";
import { HONORS, SUITS, countTiles, sameFace, sortTiles } from "./game/tile-utils.js";

export { augmentPool, augmentRarities, relicPool, relicRarities };

const HONOR_LABELS = { E: "동", S: "남", W: "서", N: "북", P: "백", F: "발", C: "중" };
const SUIT_LABELS = { m: "만", p: "통", s: "삭" };
const TILE_GLYPHS = {
  m: ["", "1만", "2만", "3만", "4만", "5만", "6만", "7만", "8만", "9만"],
  s: ["", "1삭", "2삭", "3삭", "4삭", "5삭", "6삭", "7삭", "8삭", "9삭"],
  p: ["", "1통", "2통", "3통", "4통", "5통", "6통", "7통", "8통", "9통"],
  z: { E: "동", S: "남", W: "서", N: "북", C: "중", F: "발", P: "백" },
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
const MAX_KAN_DECLARATIONS = 4;
const ROUND_CLEAR_BASE_COINS = 4;
const OVER_SCORE_PER_BONUS_COIN = 25;
const MAX_OVER_SCORE_BONUS_COINS = 6;
const TUTORIAL_CLEAR_COINS = 10;
const STARTING_HAND_SIZE = 14;
const BASE_SHOP_EDIT_LIMITS = {
  removeTile: 1,
  addTile: 1,
  upgradeTile: 1,
};
const SHOP_PRICES = {
  relic: { common: 6, rare: 9, legendary: 13 },
  augment: { common: 4, rare: 7, legendary: 10 },
  tileAdd: 3,
  tileRemove: 5,
  tileUpgrade: 4,
};
const TILE_UPGRADES = [
  { id: "polished", name: "광택", text: "이 패의 기본 점수 +3점", tileScoreBonus: 3 },
  { id: "etched", name: "각인", text: "이 패의 기본 점수 +5점", tileScoreBonus: 5 },
];
export function newRun() {
  const playerTiles = buildStartingPlayerTiles();
  const round = createRoundDeal(playerTiles);

  return {
    mode: "main",
    deck: round.deck,
    hand: round.hand,
    selected: [],
    dora: getVisibleDoraIndicators(round.doraState)[0],
    doraState: round.doraState,
    deadWall: round.deadWall,
    kan: emptyKanState(),
    roundIndex: 0,
    maxDiscards: BASE_MAX_DISCARDS,
    discardsLeft: BASE_MAX_DISCARDS,
    riichi: emptyRiichiState(),
    relics: [],
    augments: [],
    playerTiles,
    shop: null,
    shopEditLimits: { ...BASE_SHOP_EDIT_LIMITS },
    coins: 0,
    status: "startReward",
    rewardOptions: getStartRewardOptions(),
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
    augments: [],
    playerTiles: [],
    shop: null,
    shopEditLimits: { ...BASE_SHOP_EDIT_LIMITS },
    coins: 0,
    status: "title",
    message: "튜토리얼로 감을 익히거나 바로 본 게임을 시작하세요.",
  };
}

export function newTutorial() {
  return {
    mode: "tutorial",
    deck: [],
    hand: [],
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
    relics: [],
    augments: [],
    playerTiles: buildTutorialPlayerTiles(),
    shop: null,
    shopEditLimits: { ...BASE_SHOP_EDIT_LIMITS },
    coins: 0,
    status: "startReward",
    rewardOptions: getTutorialStartRewardOptions(),
    tutorial: {
      step: "startReward",
      hasVisitedShop: false,
      hasEditedTile: false,
      hasStartedNextRound: false,
    },
    message: "시작 유물을 하나 선택하세요. 유물은 런 동안 계속 효과를 줍니다.",
  };
}

export function startRound(state) {
  const round = createRoundDeal(state.playerTiles?.length ? state.playerTiles : buildStartingPlayerTiles());
  return {
    ...state,
    mode: "main",
    deck: round.deck,
    hand: round.hand,
    selected: [],
    dora: getVisibleDoraIndicators(round.doraState)[0],
    doraState: round.doraState,
    deadWall: round.deadWall,
    kan: emptyKanState(),
    discardsLeft: state.maxDiscards,
    riichi: emptyRiichiState(),
    shop: null,
    status: "playing",
    message: `${rounds[state.roundIndex].name} 시작.`,
  };
}

function startTutorialRound(state, message = "연습국 시작. 손패에서 동을 선택해 교환해 보세요.") {
  return {
    ...state,
    mode: "tutorial",
    deck: [fixedTile("p", 6, "tutorial-draw")],
    hand: getTutorialHand(),
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
    maxDiscards: state.maxDiscards,
    discardsLeft: state.maxDiscards,
    riichi: emptyRiichiState(),
    status: "tutorial",
    message,
  };
}

function getTutorialHand() {
  return sortTiles([
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
      ? "좋아요. 이제 4면자+1머리 형태가 완성되었습니다. 조합 제출을 눌러 보세요."
      : `${replacements.length}장을 교환했습니다.`,
  };
}

export function declareRiichi(state) {
  if (state.status !== "playing" || state.riichi?.active || state.discardsLeft <= 0) return state;
  const riichiState = getRiichiState(state.hand, state.deck);
  if (!riichiState.canRiichi) {
    return { ...state, selected: [], message: "아직 리치를 선언할 수 없습니다. 한 장 교체로 완료 가능한 형태가 필요합니다." };
  }

  return {
    ...state,
    selected: [],
    riichi: {
      active: true,
      phase: "selectingDiscard",
      exchangeTileId: null,
      waits: [],
      candidates: riichiState.candidates,
      attemptsUsed: 0,
      lastDiscardedTile: null,
      lastDrawnTile: null,
    },
    message: "리치할 버림패를 선택하세요. 취소할 수도 있습니다.",
  };
}

export function cancelRiichi(state) {
  if (state.riichi?.phase !== "selectingDiscard") return state;
  return {
    ...state,
    selected: [],
    riichi: emptyRiichiState(),
    message: "리치를 취소했습니다.",
  };
}

export function confirmRiichiDiscard(state, tileId) {
  if (state.status !== "playing" || state.riichi?.phase !== "selectingDiscard") return state;
  const candidate = state.riichi.candidates.find((item) => item.exchangeTileId === tileId);
  if (!candidate) {
    return { ...state, selected: [], message: "리치 가능한 버림패를 선택하세요." };
  }

  return {
    ...state,
    selected: [],
    riichi: {
      ...state.riichi,
      active: true,
      phase: "declared",
      exchangeTileId: candidate.exchangeTileId,
      waits: candidate.waits,
      attemptsUsed: 0,
      lastDiscardedTile: null,
      lastDrawnTile: null,
    },
    message: `리치 선언. 대기패: ${formatWaits(candidate.waits, tileName)}`,
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
    message: `리치 진행 중... ${attemptsUsed}번째 교체 (${tileName(exchangeTile)} -> ${tileName(replacement)})`,
  };

  if (isRiichiWinningHand(current.hand)) {
    return {
      ...current,
      riichi: {
        ...current.riichi,
        phase: "ready",
        exchangeTileId: null,
      },
      message: `리치 성공! ${attemptsUsed}번 교체 끝에 ${tileName(replacement)} 대기로 완료했습니다. 조합 제출을 눌러 점수를 확정하세요.`,
    };
  }

  if (current.discardsLeft <= 0) return failRiichi(current);
  return current;
}

export function getAvailableKans(state) {
  if (!canAct(state) || state.riichi?.active) return [];
  if ((state.kan?.declaredCount ?? 0) >= MAX_KAN_DECLARATIONS) return [];
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
      ? `${tileName(kan.tile)} 깡 후 영상패 ${tileName(rinshanTile)}로 완료했습니다. 조합 제출을 눌러 점수를 확정하세요.`
      : `${tileName(kan.tile)} 깡 후 영상패 ${tileName(rinshanTile)}를 가져오고 도라가 하나 더 공개되었습니다.`,
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
    const coinReward = getTutorialClearCoins(result.totalScore, targetScore);
    return {
      ...state,
      status: "shop",
      coins: state.coins + coinReward.totalCoins,
      selected: [],
      rewardOptions: [],
      shop: createTutorialShopState(state, result, targetScore, coinReward),
      tutorial: {
        ...(state.tutorial ?? {}),
        step: "shopIntro",
        hasVisitedShop: true,
      },
      message: `${result.totalScore}점으로 연습국을 통과했습니다. ${coinReward.totalCoins}코인을 받고 상점에 들어왔습니다.`,
    };
  }

  const nextRoundIndex = state.roundIndex + 1;
  const coinReward = getRoundClearCoins(result.totalScore, targetScore);
  if (nextRoundIndex >= rounds.length) {
    return {
      ...state,
      status: "won",
      coins: state.coins + coinReward.totalCoins,
      message: successMessage ?? `최종 ${result.totalScore}점. 완주 성공! ${coinReward.totalCoins}코인을 획득했습니다.`,
    };
  }

  return {
    ...state,
    status: "shop",
    coins: state.coins + coinReward.totalCoins,
    selected: [],
    rewardOptions: [],
    shop: createShopState(state, result, targetScore, coinReward),
    message: successMessage ?? `${result.totalScore}점으로 통과했습니다. ${coinReward.totalCoins}코인을 획득했습니다.`,
  };
}

export function chooseRelic(state, relicId) {
  return chooseReward(state, relicId);
}

export function chooseReward(state, rewardId) {
  const reward = findReward(state, rewardId);
  if (!["reward", "startReward"].includes(state.status) || !reward) return state;

  if (reward.type === "augment") return chooseAugmentReward(state, reward.item);
  return chooseRelicReward(state, reward.item);
}

function chooseRelicReward(state, relic) {
  const playerState = applyRelicPlayerEffect(state, relic);

  if (state.status === "startReward") {
    if (state.mode === "tutorial") {
      return startTutorialRound({
        ...playerState,
        relics: [relic],
        rewardOptions: [],
        tutorial: {
          ...(state.tutorial ?? {}),
          step: "selectDiscard",
        },
      }, `${relic.name}을 선택했습니다. 이제 손패에서 동을 선택해 교환해 보세요.`);
    }

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

function chooseAugmentReward(state, augment) {
  if (state.status === "startReward") return state;

  return startRound({
    ...state,
    augments: [...(state.augments ?? []), augment],
    roundIndex: state.roundIndex + 1,
    rewardOptions: [],
  });
}

export function buyShopOffer(state, offerId) {
  if (state.status !== "shop") return state;
  const offers = getFlatShopOffers(state.shop);
  const offer = offers.find((item) => item.id === offerId);
  if (!offer) return state;
  if (offer.sold) return { ...state, message: "이미 구매한 상품입니다." };
  if (state.coins < offer.price) return { ...state, message: "코인이 부족합니다." };

  if (offer.type === "relic") {
    const playerState = applyRelicPlayerEffect(
      { ...state, coins: state.coins - offer.price },
      offer.item,
    );
    return markShopOfferSold({
      ...playerState,
      relics: [...playerState.relics, offer.item],
      shop: refreshCurrentShopLimits(playerState.shop, playerState.shopEditLimits),
      message: `${offer.item.name}을 구매했습니다.`,
    }, offerId);
  }

  if (offer.type === "augment") {
    return markShopOfferSold({
      ...state,
      coins: state.coins - offer.price,
      augments: [...(state.augments ?? []), offer.item],
      message: `${offer.item.name}을 구매했습니다.`,
    }, offerId);
  }

  if (offer.type === "tileAdd") {
    return buyTileAdd(state, offerId);
  }

  if (offer.type === "tileUpgrade") {
    return buyTileUpgrade(state, offerId);
  }

  if (offer.type === "tileRemove") {
    return buyTileRemoval(state, offerId);
  }

  return state;
}

export function buyTileAdd(state, offerId) {
  if (state.status !== "shop") return state;
  const offer = (state.shop?.offers?.tileAdds ?? []).find((item) => item.id === offerId);
  if (!offer) return state;
  if (offer.sold) return { ...state, message: "이미 추가한 패입니다." };
  if (!canUseShopEdit(state, "addTile")) return state;
  if (state.coins < offer.price) return { ...state, message: "코인이 부족합니다." };
  const tile = createPlayerTile(offer.tile.suit, offer.tile.value, "shop-add", offer.tile.enhancement);
  return markShopOfferSold({
    ...state,
    coins: state.coins - offer.price,
    playerTiles: [...(state.playerTiles ?? []), tile],
    shop: useShopEdit(state.shop, "addTile"),
    message: `${tileName(tile)}을 패 풀에 추가했습니다.`,
  }, offerId);
}

export function buyTileRemoval(state, offerId) {
  if (state.status !== "shop") return state;
  const offer = (state.shop?.offers?.tileRemoves ?? []).find((item) => item.id === offerId);
  if (!offer) return state;
  if (offer.sold) return { ...state, message: "이미 삭제한 패입니다." };
  if (!canUseShopEdit(state, "removeTile")) return state;
  if (state.coins < SHOP_PRICES.tileRemove) return { ...state, message: "코인이 부족합니다." };
  const tile = (state.playerTiles ?? []).find((item) => item.copyId === offer.tile.copyId);
  if (!tile) return state;
  if ((state.playerTiles ?? []).length <= 1) {
    return { ...state, message: "패 풀의 마지막 1장은 삭제할 수 없습니다." };
  }
  return markShopOfferSold({
    ...state,
    coins: state.coins - SHOP_PRICES.tileRemove,
    playerTiles: state.playerTiles.filter((item) => item.copyId !== offer.tile.copyId),
    shop: useShopEdit(state.shop, "removeTile"),
    message: `${tileName(tile)}을 패 풀에서 삭제했습니다.`,
  }, offerId);
}

export function buyTileUpgrade(state, offerId) {
  if (state.status !== "shop") return state;
  const offer = (state.shop?.offers?.tileUpgrades ?? []).find((item) => item.id === offerId);
  if (!offer) return state;
  if (offer.sold) return { ...state, message: "이미 강화한 패입니다." };
  if (!canUseShopEdit(state, "upgradeTile")) return state;
  if (state.coins < offer.price) return { ...state, message: "코인이 부족합니다." };
  const upgrade = offer.upgrade;
  const tile = (state.playerTiles ?? []).find((item) => item.copyId === offer.tile.copyId);
  if (!tile) return state;
  const nextEnhancement = combineEnhancement(tile.enhancement, upgrade);
  const nextState = markShopOfferSold({
    ...state,
    coins: state.coins - offer.price,
    playerTiles: state.playerTiles.map((item) =>
      item.copyId === offer.tile.copyId ? { ...item, enhancement: nextEnhancement } : item,
    ),
    shop: useShopEdit(state.shop, "upgradeTile"),
    tutorial: state.mode === "tutorial"
      ? { ...(state.tutorial ?? {}), step: "nextRound", hasEditedTile: true }
      : state.tutorial,
    message: state.mode === "tutorial"
      ? `${tileName(tile)}을 강화했습니다. 이제 다음 라운드 버튼을 눌러 튜토리얼을 마무리하세요.`
      : `${tileName(tile)}을 강화했습니다.`,
  }, offerId);
  return nextState;
}

export function leaveShop(state) {
  if (state.status !== "shop") return state;
  if (state.mode === "tutorial") {
    return {
      ...state,
      selected: [],
      shop: null,
      status: "tutorialComplete",
      tutorial: {
        ...(state.tutorial ?? {}),
        step: "complete",
        hasStartedNextRound: true,
      },
      message: "튜토리얼 완료. 이제 본 게임에서 이 흐름을 반복해 오라스까지 완주해 보세요.",
    };
  }
  return startRound({
    ...state,
    roundIndex: state.roundIndex + 1,
  });
}

export function scoreHand(tiles, dora, relics = [], context = {}) {
  const counts = countTiles(tiles);
  const analysis = analyzeHand(tiles);
  const regularYaku = analysis.isComplete ? evaluateYaku(tiles, analysis, context) : [];
  const rogueYaku = evaluateRogueYaku(tiles, analysis, context);
  const yaku = [...regularYaku, ...rogueYaku];
  const doraBreakdown = getDoraBreakdown(tiles, dora, context);
  const doraCount = doraBreakdown.totalCount;
  const tileScore = tiles.reduce((sum, tile) => sum + getTileScore(tile), 0);
  const yakuScore = yaku.reduce((sum, item) => sum + item.score, 0);
  const doraScore = analysis.isComplete ? doraCount * DORA_SCORE : 0;
  const totalHan = yaku.reduce((sum, item) => sum + item.han, 0) + (analysis.isComplete ? doraCount : 0);
  const yakuCompletionMultiplier = getYakuCompletionMultiplier(yaku, totalHan);
  const scoreContext = { tiles, analysis, yaku, counts, doraCount, doraHan: doraCount };
  const relicBonuses = relics
    .map((relic) => ({ relic, bonus: getRelicScoreBonus(relic, scoreContext) }))
    .filter((item) => hasScoreBonus(item.bonus));
  const augmentBonuses = (context.augments ?? [])
    .map((augment) => ({ augment, bonus: getAugmentScoreBonus(augment, scoreContext) }))
    .filter((item) => hasScoreBonus(item.bonus));
  const riichiMultiplierBonus = getRiichiMultiplierBonus(context);
  const bonusTotals = addScoreBonuses(
    [...relicBonuses, ...augmentBonuses].reduce(addScoreBonuses, emptyScoreBonus()),
    { yakuMultiplierBonus: riichiMultiplierBonus },
  );
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
    augmentBonuses,
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

function getTileScore(tile) {
  return getTileBaseScore(tile) + (tile.enhancement?.tileScoreBonus ?? 0);
}

function evaluateRogueYaku(tiles, analysis, context = {}) {
  if (!analysis.isComplete) return [];
  const results = [];
  const counts = countTiles(tiles);
  const highestDuplicate = Math.max(0, ...counts.values());
  const playerTileCount = context.playerTiles?.length ?? null;

  if (highestDuplicate >= 5) {
    results.push({
      id: "rogue-fivefold-face",
      name: "오중 울림",
      han: 2,
      score: 28,
      text: "완성 손패에 같은 얼굴의 패가 5장 이상 있습니다.",
      rogue: true,
    });
  }

  if (highestDuplicate >= 6) {
    results.push({
      id: "rogue-sixfold-face",
      name: "육중 울림",
      han: 3,
      score: 42,
      text: "완성 손패에 같은 얼굴의 패가 6장 이상 있습니다.",
      rogue: true,
    });
  }

  if (playerTileCount !== null && playerTileCount < STARTING_HAND_SIZE) {
    results.push({
      id: "rogue-thin-wall",
      name: "얇은 패산",
      han: 1,
      score: 16,
      text: "플레이어 패 풀이 14장보다 적은 상태에서 승리했습니다.",
      rogue: true,
    });
  }

  return results;
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

function getAugmentScoreBonus(augment, context) {
  if (!augment.effect) return emptyScoreBonus();
  return normalizeScoreBonus(augment.effect(context));
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
    augments: state.augments ?? [],
    playerTiles: state.playerTiles ?? [],
    rinshan: state.kan?.rinshanReady === true,
    kanCount: state.kan?.declaredCount ?? 0,
    kanSets: state.kan?.sets ?? [],
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
    candidates: [],
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

function getRoundClearCoins(totalScore, targetScore) {
  const overScore = Math.max(0, totalScore - targetScore);
  const bonusCoins = Math.min(MAX_OVER_SCORE_BONUS_COINS, Math.floor(overScore / OVER_SCORE_PER_BONUS_COIN));
  return {
    baseCoins: ROUND_CLEAR_BASE_COINS,
    bonusCoins,
    totalCoins: ROUND_CLEAR_BASE_COINS + bonusCoins,
    overScore,
  };
}

function getTutorialClearCoins(totalScore, targetScore) {
  return {
    baseCoins: TUTORIAL_CLEAR_COINS,
    bonusCoins: 0,
    totalCoins: TUTORIAL_CLEAR_COINS,
    overScore: Math.max(0, totalScore - targetScore),
  };
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

function buildStartingPlayerTiles() {
  return buildDeck().map((tile) => ({
    ...tile,
    copyId: `player-${tile.copyId}`,
  }));
}

function buildTutorialPlayerTiles() {
  const faces = [
    ["m", 2], ["m", 2], ["m", 3], ["m", 3], ["m", 4], ["m", 4],
    ["m", 6], ["m", 7], ["m", 8],
    ["p", 2], ["p", 3], ["p", 4], ["p", 6], ["p", 6],
    ["s", 3], ["s", 4], ["s", 5], ["s", 9],
    ["z", "E"], ["z", "S"], ["z", "P"], ["z", "F"],
  ];
  return faces.map(([suit, value], index) => createPlayerTile(suit, value, `tutorial-player-${index}`));
}

function createRoundDeal(playerTiles) {
  const wall = setupWall();
  return {
    deck: wall.liveWall,
    hand: sortTiles(drawPlayerHand(playerTiles, STARTING_HAND_SIZE)),
    doraState: wall.doraState,
    deadWall: wall.deadWall,
  };
}

function drawPlayerHand(playerTiles, count) {
  const source = playerTiles?.length ? playerTiles : buildStartingPlayerTiles();
  const shuffled = shuffle(source);
  const hand = [];
  for (let index = 0; index < count; index += 1) {
    const base = index < shuffled.length ? shuffled[index] : source[Math.floor(Math.random() * source.length)];
    hand.push(cloneTileForRound(base, "hand"));
  }
  return hand;
}

function cloneTileForRound(tile, prefix) {
  return {
    suit: tile.suit,
    value: tile.value,
    enhancement: tile.enhancement ? { ...tile.enhancement } : undefined,
    copyId: `${prefix}-${tile.suit}${tile.value}-${crypto.randomUUID()}`,
  };
}

function createPlayerTile(suit, value, prefix = "player", enhancement = undefined) {
  return {
    suit,
    value,
    enhancement: enhancement ? { ...enhancement } : undefined,
    copyId: `${prefix}-${suit}${value}-${crypto.randomUUID()}`,
  };
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
  const player = relic.player({
    maxDiscards: state.maxDiscards,
    shopEditLimits: state.shopEditLimits ?? { ...BASE_SHOP_EDIT_LIMITS },
  });
  return {
    ...state,
    maxDiscards: player.maxDiscards,
    discardsLeft: Math.min(state.discardsLeft, player.maxDiscards),
    shopEditLimits: player.shopEditLimits ?? state.shopEditLimits,
  };
}

export function canAct(state) {
  return state.status === "playing" || state.status === "tutorial";
}

export function getAvailableRiichi(state) {
  if (state.status !== "playing" || state.riichi?.active || state.discardsLeft <= 0) {
    return { canRiichi: false, exchangeTileId: null, waits: [], candidates: [] };
  }
  return getRiichiState(state.hand, state.deck);
}

function draw(deck, count) {
  return deck.splice(0, count);
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getStartRewardOptions() {
  return getRelicRewardOptions([], 3);
}

function getTutorialStartRewardOptions() {
  return getRelicRewardOptionsById(["bamboo-lens", "dora-bell", "pair-coin"], []);
}

function getRewardOptions(state) {
  return [
    ...getRelicRewardOptions(state.relics ?? [], 1),
    ...getAugmentRewardOptions(state.augments ?? [], 2),
  ];
}

function getRelicRewardOptions(currentRelics, count) {
  const owned = new Set(currentRelics.map((relic) => relic.id));
  return drawWeightedItems(relicPool.filter((relic) => !owned.has(relic.id)), count).map((item) =>
    createRewardOption("relic", item),
  );
}

function getAugmentRewardOptions(currentAugments, count) {
  const owned = new Set(currentAugments.map((augment) => augment.id));
  return drawWeightedItems(augmentPool.filter((augment) => !owned.has(augment.id)), count).map((item) =>
    createRewardOption("augment", item),
  );
}

function getRelicRewardOptionsById(ids, currentRelics) {
  const owned = new Set(currentRelics.map((relic) => relic.id));
  return ids
    .map((id) => relicPool.find((relic) => relic.id === id))
    .filter((relic) => relic && !owned.has(relic.id))
    .map((item) => createRewardOption("relic", item));
}

function getAugmentRewardOptionsById(ids, currentAugments) {
  const owned = new Set(currentAugments.map((augment) => augment.id));
  return ids
    .map((id) => augmentPool.find((augment) => augment.id === id))
    .filter((augment) => augment && !owned.has(augment.id))
    .map((item) => createRewardOption("augment", item));
}

function createShopState(state, result, targetScore, coinReward) {
  return {
    roundIndex: state.roundIndex,
    lastScore: result.totalScore,
    lastTargetScore: targetScore,
    lastReward: coinReward,
    offers: {
      relics: getRelicRewardOptions(state.relics ?? [], 2).map(createShopOffer),
      augments: getAugmentRewardOptions(state.augments ?? [], 2).map(createShopOffer),
      tileUpgrades: createTileUpgradeOffers(state.playerTiles ?? [], 3),
      tileAdds: createTileAddOffers(state.playerTiles ?? [], 3),
      tileRemoves: createTileRemoveOffers(state.playerTiles ?? [], 3),
    },
    editsUsed: {
      removeTile: 0,
      addTile: 0,
      upgradeTile: 0,
    },
    editsLimit: { ...(state.shopEditLimits ?? BASE_SHOP_EDIT_LIMITS) },
  };
}

function createTutorialShopState(state, result, targetScore, coinReward) {
  const playerTiles = state.playerTiles ?? buildTutorialPlayerTiles();
  return {
    roundIndex: state.roundIndex,
    lastScore: result.totalScore,
    lastTargetScore: targetScore,
    lastReward: coinReward,
    offers: {
      relics: getRelicRewardOptionsById(["spare-wall"], state.relics ?? []).map(createShopOffer),
      augments: getAugmentRewardOptionsById(["five-manzu-tuning"], state.augments ?? []).map(createShopOffer),
      tileUpgrades: createFixedTileOffers(playerTiles, [
        ["p", 6],
        ["m", 2],
        ["z", "P"],
      ], "tileUpgrade"),
      tileAdds: createFixedTileOffers(playerTiles, [
        ["p", 6],
        ["m", 3],
        ["m", 4],
      ], "tileAdd"),
      tileRemoves: createFixedTileOffers(playerTiles, [
        ["z", "E"],
        ["z", "S"],
        ["s", 9],
      ], "tileRemove"),
    },
    editsUsed: {
      removeTile: 0,
      addTile: 0,
      upgradeTile: 0,
    },
    editsLimit: { ...(state.shopEditLimits ?? BASE_SHOP_EDIT_LIMITS) },
  };
}

function createShopOffer(reward) {
  return {
    ...reward,
    price: getShopRewardPrice(reward),
    sold: false,
  };
}

function createTileAddOffers(playerTiles, count) {
  return drawWeightedItems(playerTiles, count).map((tile, index) => ({
    id: `tile-add-${tile.suit}${tile.value}-${index}-${crypto.randomUUID()}`,
    type: "tileAdd",
    name: `${tileName(tile)} 추가`,
    text: "현재 패 풀에 이 패의 복사본을 1장 추가합니다.",
    rarity: "common",
    tile,
    price: SHOP_PRICES.tileAdd,
    sold: false,
  }));
}

function createFixedTileOffers(playerTiles, faces, type) {
  return faces
    .map(([suit, value]) => findPlayerTile(playerTiles, suit, value))
    .filter(Boolean)
    .map((tile, index) => createTileEditOffer(tile, index, type));
}

function createTileEditOffer(tile, index, type) {
  if (type === "tileUpgrade") {
    const upgrade = TILE_UPGRADES[index % TILE_UPGRADES.length];
    return {
      id: `tile-upgrade-${tile.suit}${tile.value}-${index}-${crypto.randomUUID()}`,
      type: "tileUpgrade",
      name: `${tileName(tile)} 강화`,
      text: upgrade.text,
      rarity: "common",
      tile,
      upgrade,
      price: SHOP_PRICES.tileUpgrade,
      sold: false,
    };
  }

  if (type === "tileAdd") {
    return {
      id: `tile-add-${tile.suit}${tile.value}-${index}-${crypto.randomUUID()}`,
      type: "tileAdd",
      name: `${tileName(tile)} 추가`,
      text: "현재 패 풀에 이 패의 복사본을 1장 추가합니다.",
      rarity: "common",
      tile,
      price: SHOP_PRICES.tileAdd,
      sold: false,
    };
  }

  return {
    id: `tile-remove-${tile.suit}${tile.value}-${index}-${crypto.randomUUID()}`,
    type: "tileRemove",
    name: `${tileName(tile)} 삭제`,
    text: "현재 패 풀에서 이 패를 1장 삭제합니다.",
    rarity: "common",
    tile,
    price: SHOP_PRICES.tileRemove,
    sold: false,
  };
}

function findPlayerTile(playerTiles, suit, value) {
  return playerTiles.find((tile) => tile.suit === suit && tile.value === value);
}

function createTileUpgradeOffers(playerTiles, count) {
  return drawWeightedItems(playerTiles, count).map((tile, index) => {
    const upgrade = TILE_UPGRADES[index % TILE_UPGRADES.length];
    return {
      id: `tile-upgrade-${tile.suit}${tile.value}-${index}-${crypto.randomUUID()}`,
      type: "tileUpgrade",
      name: `${tileName(tile)} 강화`,
      text: upgrade.text,
      rarity: "common",
      tile,
      upgrade,
      price: SHOP_PRICES.tileUpgrade,
      sold: false,
    };
  });
}

function createTileRemoveOffers(playerTiles, count) {
  return drawWeightedItems(playerTiles, count).map((tile, index) => ({
    id: `tile-remove-${tile.suit}${tile.value}-${index}-${crypto.randomUUID()}`,
    type: "tileRemove",
    name: `${tileName(tile)} 삭제`,
    text: "현재 패 풀에서 이 패를 1장 삭제합니다.",
    rarity: "common",
    tile,
    price: SHOP_PRICES.tileRemove,
    sold: false,
  }));
}

function getShopRewardPrice(reward) {
  if (reward.type === "relic") return SHOP_PRICES.relic[reward.rarity] ?? SHOP_PRICES.relic.common;
  if (reward.type === "augment") return SHOP_PRICES.augment[reward.rarity] ?? SHOP_PRICES.augment.common;
  return SHOP_PRICES.tileAdd;
}

function getFlatShopOffers(shop) {
  return [
    ...(shop?.offers?.relics ?? []),
    ...(shop?.offers?.augments ?? []),
    ...(shop?.offers?.tileUpgrades ?? []),
    ...(shop?.offers?.tileAdds ?? []),
    ...(shop?.offers?.tileRemoves ?? []),
  ];
}

function markShopOfferSold(state, offerId) {
  return {
    ...state,
    shop: {
      ...state.shop,
      offers: Object.fromEntries(
        Object.entries(state.shop.offers).map(([key, offers]) => [
          key,
          offers.map((offer) => offer.id === offerId ? { ...offer, sold: true } : offer),
        ]),
      ),
    },
  };
}

function refreshCurrentShopLimits(shop, shopEditLimits) {
  if (!shop) return shop;
  return {
    ...shop,
    editsLimit: { ...(shopEditLimits ?? BASE_SHOP_EDIT_LIMITS) },
  };
}

function canUseShopEdit(state, type) {
  const used = state.shop?.editsUsed?.[type] ?? 0;
  const limit = state.shop?.editsLimit?.[type] ?? 0;
  return used < limit;
}

function useShopEdit(shop, type) {
  return {
    ...shop,
    editsUsed: {
      ...shop.editsUsed,
      [type]: (shop.editsUsed?.[type] ?? 0) + 1,
    },
  };
}

function combineEnhancement(current, upgrade) {
  const tileScoreBonus = (current?.tileScoreBonus ?? 0) + upgrade.tileScoreBonus;
  return {
    id: upgrade.id,
    name: current?.name ? `${current.name}+${upgrade.name}` : upgrade.name,
    text: `이 패의 기본 점수 +${tileScoreBonus}점`,
    tileScoreBonus,
  };
}

function createRewardOption(type, item) {
  return {
    ...item,
    type,
    item,
  };
}

function findReward(state, rewardId) {
  const option = (state.rewardOptions ?? []).find((item) => item.id === rewardId);
  if (option?.item) return option;
  const relic = relicPool.find((item) => item.id === rewardId);
  if (relic) return createRewardOption("relic", relic);
  const augment = augmentPool.find((item) => item.id === rewardId);
  if (augment) return createRewardOption("augment", augment);
  return null;
}

function drawWeightedItems(candidates, count) {
  const options = [];
  const pool = [...candidates];
  while (options.length < count && pool.length > 0) {
    const selected = takeWeightedItem(pool);
    options.push(selected);
    pool.splice(pool.indexOf(selected), 1);
  }
  return options;
}

function takeWeightedItem(candidates) {
  const totalWeight = candidates.reduce((sum, item) => sum + getRewardWeight(item), 0);
  let roll = Math.random() * totalWeight;
  for (const item of candidates) {
    roll -= getRewardWeight(item);
    if (roll <= 0) return item;
  }
  return candidates.at(-1);
}

function getRewardWeight(item) {
  return relicRarities[item.rarity]?.weight ?? relicRarities.common.weight;
}


