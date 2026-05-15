import {
  scoreHand,
  newTutorial,
  exchangeSelected,
  newRun,
  chooseRelic,
  chooseReward,
  augmentPool,
  relicPool,
  relicRarities,
  getAvailableRiichi,
  getAvailableKans,
  declareRiichi,
  confirmRiichiDiscard,
  cancelRiichi,
  declareKan,
  advanceRiichi,
  submitHand,
  getScoringTiles,
} from "../src/game.js";

const cases = [
  { name: "삼색동순", hand: "234m 234p 234s 345s 66p", includes: ["삼색동순"] },
  { name: "일기통관", hand: "123m 456m 789m 111p 99s", includes: ["일기통관"] },
  { name: "삼색동각", hand: "222m 222p 222s 345m 99p", includes: ["삼색동각"] },
  { name: "소삼원", hand: "PPPz FFFz CCz 123m 123p", includes: ["소삼원", "역패"] },
  { name: "칠대자", hand: "11m 22m 33p 44p 55s 66s EEz", includes: ["칠대자"] },
  { name: "량페코", hand: "223344m 556677p 88s", includes: ["량페코"], excludes: ["이페코"] },
  { name: "이페코", hand: "123m 123m 456p 789p 55s", includes: ["이페코"] },
  { name: "혼노두", hand: "11m 99m 11p 99p 11s 99s EEz", includes: ["혼노두", "칠대자"] },
  { name: "찬타", hand: "123m 789m EEEz 999p SSz", includes: ["찬타"], excludes: ["준찬타"] },
  { name: "준찬타", hand: "123m 789m 111p 999p 99s", includes: ["준찬타"], excludes: ["찬타"] },
  { name: "국사무쌍", hand: "19m 19p 19s ESWNPFCz 1m", includes: ["국사무쌍"], excludes: ["혼노두"] },
  { name: "사암각", hand: "111m 222p 333s CCCz 99m", includes: ["사암각"], excludes: ["또이또이", "삼암각"] },
  { name: "대삼원", hand: "PPPz FFFz CCCz 123m 99s", includes: ["대삼원"], excludes: ["소삼원", "역패"] },
  { name: "소사희", hand: "EEEz SSSz WWWz NNz 123m", includes: ["소사희"], excludes: ["혼일색"] },
  { name: "대사희", hand: "EEEz SSSz WWWz NNNz 11m", includes: ["대사희"], excludes: ["소사희"] },
  { name: "자일색", hand: "EEEz SSSz PPPz CCCz FFz", includes: ["자일색"], excludes: ["혼일색"] },
  { name: "청노두", hand: "111m 999m 111p 999p 11s", includes: ["청노두"], excludes: ["혼노두"] },
  { name: "녹일색", hand: "222s 333s 444s 666s FFz", includes: ["녹일색"], excludes: ["혼일색"] },
  { name: "구련보등", hand: "11123456789999m", includes: ["구련보등"], excludes: ["청일색"] },
];

cases.forEach((testCase) => {
  const yakuNames = namesFor(testCase.hand);
  assertIncludes(testCase.name, yakuNames, testCase.includes);
  assertExcludes(testCase.name, yakuNames, testCase.excludes ?? []);
});

const tutorial = newTutorial();
const discardedEast = {
  ...tutorial,
  selected: ["tutorial-discard"],
};
const tutorialScore = scoreHand(exchangeSelected(discardedEast).hand, tutorial.dora, tutorial.relics);
if (!tutorialScore.isComplete) {
  throw new Error("튜토리얼 손패가 더 이상 화료로 판정되지 않습니다.");
}

const run = newRun();
if (run.status !== "startReward" || run.rewardOptions.length !== 3 || run.relics.length !== 0) {
  throw new Error("새 런이 시작 유물 3택 상태로 시작하지 않습니다.");
}

if (run.rewardOptions.some((relic) => !relicRarities[relic.rarity])) {
  throw new Error("시작 유물 후보에 알 수 없는 희귀도가 있습니다.");
}

if (relicPool.some((relic) => !relicRarities[relic.rarity])) {
  throw new Error("희귀도가 없는 유물이 있습니다.");
}

const runWithRelic = chooseRelic(run, run.rewardOptions[0].id);
if (runWithRelic.status !== "playing" || runWithRelic.relics.length !== 1) {
  throw new Error("시작 유물 선택 후 본 게임이 시작되지 않습니다.");
}

const rewardAugment = augmentPool.find((augment) => augment.id === "tanyao-focus");
const rewardState = {
  ...runWithRelic,
  status: "reward",
  rewardOptions: [{ ...rewardAugment, type: "augment", item: rewardAugment }],
};
const runWithAugment = chooseReward(rewardState, "tanyao-focus");
if (runWithAugment.status !== "playing" || runWithAugment.augments.length !== 1) {
  throw new Error("증강 보상 선택 후 다음 라운드가 시작되지 않았습니다.");
}

const tanyaoScore = scoreHand(parseHand("234m 234p 345s 678m 66p"), { suit: "m", value: 1, copyId: "test-dora" });
if (tanyaoScore.yakuCompletionMultiplier <= 1 || tanyaoScore.globalMultiplier <= 1) {
  throw new Error("역 완성 손패에 기본 배수가 적용되지 않습니다.");
}

const incompleteScore = scoreHand(parseHand("123m 456m 789m 123p ESz"), { suit: "m", value: 1, copyId: "test-dora" });
if (incompleteScore.yakuCompletionMultiplier !== 1 || incompleteScore.globalMultiplier !== 1) {
  throw new Error("미완성 손패에 역 완성 배수가 적용되고 있습니다.");
}

const tanyaoAugment = augmentPool.find((augment) => augment.id === "tanyao-focus");
const tanyaoWithAugment = scoreHand(
  parseHand("234m 234p 345s 678m 66p"),
  { suit: "m", value: 1, copyId: "test-dora" },
  [],
  { augments: [tanyaoAugment] },
);
if (tanyaoWithAugment.yakuScoreBonus !== 12 || tanyaoWithAugment.augmentBonuses.length !== 1) {
  throw new Error("특정 역 증강이 해당 역 점수에 반영되지 않았습니다.");
}

const noTanyaoWithAugment = scoreHand(
  parseHand("123m 234p 345s 678m 66p"),
  { suit: "m", value: 1, copyId: "test-dora" },
  [],
  { augments: [tanyaoAugment] },
);
if (noTanyaoWithAugment.augmentBonuses.length !== 0 || noTanyaoWithAugment.yakuScoreBonus !== 0) {
  throw new Error("특정 역 증강이 대상 역이 없는 손패에도 반영되었습니다.");
}

const tileAugment = augmentPool.find((augment) => augment.id === "five-manzu-tuning");
const tileAugmentScore = scoreHand(
  parseHand("555m 123p 456p 789s ESz"),
  { suit: "m", value: 1, copyId: "test-dora" },
  [],
  { augments: [tileAugment] },
);
if (tileAugmentScore.tileScoreBonus !== 12 || tileAugmentScore.augmentBonuses.length !== 1) {
  throw new Error("특정 패 증강이 패 점수에 반영되지 않았습니다.");
}

if (run.doraState.indicators.length !== 5 || run.doraState.uraIndicators.length !== 5 || run.deadWall.rinshanTiles.length !== 4) {
  throw new Error("새 라운드가 도라 표시패, 뒷도라 표시패, 영상패를 별도 패산으로 준비하지 못했습니다.");
}

const multiDoraState = {
  indicators: [
    { suit: "m", value: 1, copyId: "dora-m1" },
    { suit: "p", value: 2, copyId: "dora-p2" },
  ],
  uraIndicators: [
    { suit: "s", value: 7, copyId: "ura-s7" },
    { suit: "m", value: 1, copyId: "ura-m1" },
  ],
  revealedCount: 2,
};
const multiDoraHand = parseHand("111m 234p 345p 456s 77s");
const visibleDoraScore = scoreHand(multiDoraHand, multiDoraState);
if (visibleDoraScore.doraCount !== 4 || visibleDoraScore.uraDoraCount !== 0) {
  throw new Error("복수 공개 도라가 올바르게 합산되지 않았습니다.");
}

const uraDoraScore = scoreHand(multiDoraHand, multiDoraState, [], { riichi: true, includeUraDora: true });
if (uraDoraScore.doraCount !== 9 || uraDoraScore.uraDoraCount !== 5) {
  throw new Error("리치 화료 컨텍스트에서 뒷도라가 공개 도라 수만큼 적용되지 않았습니다.");
}

const riichiOnlyState = {
  mode: "main",
  deck: [{ suit: "z", value: "E", copyId: "riichi-draw-east" }],
  hand: parseHand("123m 456p 789s 555m Ez 2p"),
  selected: [],
  dora: { suit: "m", value: 1, copyId: "test-dora" },
  roundIndex: 0,
  maxDiscards: 1,
  discardsLeft: 1,
  riichi: { active: false, exchangeTileId: null, waits: [], attemptsUsed: 0 },
  relics: [],
  coins: 0,
  status: "playing",
  rewardOptions: [],
  message: "",
};

const riichiState = getAvailableRiichi(riichiOnlyState);
if (!riichiState.canRiichi) {
  throw new Error("다른 역이 없는 완성 대기에서도 리치가 가능해야 합니다.");
}

const declaredRiichi = declareRiichi(riichiOnlyState);
if (declaredRiichi.status !== "playing" || declaredRiichi.riichi.phase !== "selectingDiscard" || declaredRiichi.discardsLeft !== 1) {
  throw new Error("리치 버튼을 누른 직후에는 취소 가능한 버림패 선택 상태로 유지되어야 합니다.");
}

const canceledRiichi = cancelRiichi(declaredRiichi);
if (canceledRiichi.riichi.active || canceledRiichi.riichi.phase !== "idle" || canceledRiichi.discardsLeft !== 1) {
  throw new Error("리치 취소가 리치 상태만 초기화하지 못했습니다.");
}

const confirmedSingleRiichi = confirmRiichiDiscard(declaredRiichi, declaredRiichi.riichi.candidates[0].exchangeTileId);
if (confirmedSingleRiichi.riichi.phase !== "declared") {
  throw new Error("단일 리치 후보 선택 후 선언 상태로 진입하지 못했습니다.");
}

const advancedRiichi = advanceRiichi(confirmedSingleRiichi);
if (advancedRiichi.status !== "playing" || advancedRiichi.riichi.phase !== "ready" || advancedRiichi.discardsLeft !== 0) {
  throw new Error("리치 성공 후 조합 제출 직전 상태로 유지되지 않았습니다.");
}

const declaredRiichiScore = scoreHand(advancedRiichi.hand, advancedRiichi.dora, advancedRiichi.relics, {
  riichi: true,
  discardsLeft: advancedRiichi.discardsLeft,
});
if (!declaredRiichiScore.isComplete || !declaredRiichiScore.yaku.some((item) => item.id === "riichi")) {
  throw new Error("리치만으로 완성형 화료 역을 충족하지 못했습니다.");
}

if (declaredRiichiScore.riichiMultiplierBonus <= 0) {
  throw new Error("리치 화료에 리치 배율 보너스가 적용되지 않았습니다.");
}

const kanState = {
  mode: "main",
  deck: [],
  hand: parseHand("1111m 234p 345p 456s 7s"),
  selected: [],
  dora: { suit: "m", value: 9, copyId: "kan-dora" },
  doraState: {
    indicators: [
      { suit: "m", value: 9, copyId: "kan-dora-1" },
      { suit: "p", value: 9, copyId: "kan-dora-2" },
      { suit: "s", value: 9, copyId: "kan-dora-3" },
      { suit: "z", value: "E", copyId: "kan-dora-4" },
      { suit: "z", value: "S", copyId: "kan-dora-5" },
    ],
    uraIndicators: [],
    revealedCount: 1,
  },
  deadWall: {
    rinshanTiles: [{ suit: "s", value: 7, copyId: "kan-rinshan-7s" }],
    drawsUsed: 0,
  },
  kan: { declaredCount: 0, sets: [], lastRinshanTileId: null, rinshanReady: false },
  roundIndex: 0,
  maxDiscards: 1,
  discardsLeft: 1,
  riichi: { active: false, exchangeTileId: null, waits: [], attemptsUsed: 0 },
  relics: [],
  coins: 0,
  status: "playing",
  rewardOptions: [],
  message: "",
};

const kanOptions = getAvailableKans(kanState);
if (kanOptions.length !== 1 || kanOptions[0].key !== "m1") {
  throw new Error("같은 패 4장을 깡 후보로 찾지 못했습니다.");
}

const afterKan = declareKan(kanState, "m1");
if (afterKan.doraState.revealedCount !== 2 || afterKan.deadWall.drawsUsed !== 1 || afterKan.deadWall.rinshanTiles.length !== 0) {
  throw new Error("깡 선언 후 도라 추가 공개 또는 영상패 소비가 올바르지 않습니다.");
}

const kanTileIds = new Set(kanState.hand.filter((tile) => tile.suit === "m" && tile.value === 1).map((tile) => tile.copyId));
if (afterKan.hand.some((tile) => kanTileIds.has(tile.copyId))) {
  throw new Error("깡한 패가 손패에 남아 있습니다.");
}

if (afterKan.kan.sets[0].tiles.length !== 4) {
  throw new Error("깡 세트가 왼쪽 표시용 4장을 보관하지 못했습니다.");
}

if (getScoringTiles(afterKan).length !== 14) {
  throw new Error("깡 후 판정용 패가 14장으로 구성되지 않았습니다.");
}

const rinshanScore = scoreHand(getScoringTiles(afterKan), afterKan.doraState, [], { rinshan: afterKan.kan.rinshanReady });
if (!rinshanScore.yaku.some((item) => item.id === "rinshanKaiho")) {
  throw new Error("깡 직후 영상패로 완성된 손패에 영상개화가 붙지 않았습니다.");
}

const maxedKanState = {
  ...kanState,
  kan: { ...kanState.kan, declaredCount: 4 },
};
if (getAvailableKans(maxedKanState).length !== 0) {
  throw new Error("깡 4번 이후에도 추가 깡 후보가 열려 있습니다.");
}

const sankantsuScore = scoreHand(parseHand("111m 222p 333s 456m 77p"), kanState.doraState, [], { kanCount: 3 });
if (!sankantsuScore.yaku.some((item) => item.id === "sankantsu")) {
  throw new Error("깡 3개에서 삼깡쯔가 붙지 않았습니다.");
}

const sukantsuScore = scoreHand(parseHand("111m 222p 333s 456m 77p"), kanState.doraState, [], { kanCount: 4 });
if (!sukantsuScore.yaku.some((item) => item.id === "sukantsu") || sukantsuScore.yaku.some((item) => item.id === "sankantsu")) {
  throw new Error("깡 4개에서 사깡쯔 역만 처리 또는 삼깡쯔 배제가 올바르지 않습니다.");
}

const submittedRiichi = submitHand(advancedRiichi);
if (submittedRiichi.status !== "reward" && submittedRiichi.status !== "won") {
  throw new Error("리치 성공 후 조합 제출로 다음 흐름에 진입하지 못했습니다.");
}

const multiRiichiState = {
  ...riichiOnlyState,
  deck: buildTestDeck(),
  hand: parseHand("123m 456p 789s 555m 22p"),
  discardsLeft: 3,
  maxDiscards: 3,
  riichi: { active: false, phase: "idle", exchangeTileId: null, waits: [], candidates: [], attemptsUsed: 0 },
};
const multiRiichi = getAvailableRiichi(multiRiichiState);
if ((multiRiichi.candidates?.length ?? 0) < 2) {
  throw new Error("리치 가능한 버림패 후보가 여러 개인 상태를 찾지 못했습니다.");
}

const selectingRiichi = declareRiichi(multiRiichiState);
if (selectingRiichi.riichi.phase !== "selectingDiscard" || selectingRiichi.riichi.candidates.length !== multiRiichi.candidates.length) {
  throw new Error("리치 후보가 여러 개일 때 버림패 선택 상태로 진입하지 않았습니다.");
}

const invalidRiichi = confirmRiichiDiscard(selectingRiichi, "not-a-candidate");
if (invalidRiichi.riichi.phase !== "selectingDiscard") {
  throw new Error("리치 후보가 아닌 패를 선택했는데 선언이 확정되었습니다.");
}

const selectedCandidate = selectingRiichi.riichi.candidates[1];
const confirmedRiichi = confirmRiichiDiscard(selectingRiichi, selectedCandidate.exchangeTileId);
if (confirmedRiichi.riichi.phase !== "declared" || confirmedRiichi.riichi.exchangeTileId !== selectedCandidate.exchangeTileId) {
  throw new Error("유저가 선택한 리치 버림패로 선언이 확정되지 않았습니다.");
}

console.log(`Yaku checks passed: ${cases.length + 29}`);

function namesFor(handText) {
  return scoreHand(parseHand(handText), { suit: "m", value: 1, copyId: "test-dora" }).yaku.map((item) => item.name);
}

function assertIncludes(caseName, actual, expected) {
  expected.forEach((name) => {
    if (!actual.includes(name)) {
      throw new Error(`${caseName}: expected ${name}, got [${actual.join(", ")}]`);
    }
  });
}

function assertExcludes(caseName, actual, expected) {
  expected.forEach((name) => {
    if (actual.includes(name)) {
      throw new Error(`${caseName}: expected to exclude ${name}, got [${actual.join(", ")}]`);
    }
  });
}

function parseHand(text) {
  let index = 0;
  return text.trim().split(/\s+/).flatMap((group) => {
    const suit = group.at(-1);
    return [...group.slice(0, -1)].map((value) => ({
      suit,
      value: suit === "z" ? value : Number(value),
      copyId: `test-${index++}`,
    }));
  });
}

function buildTestDeck() {
  let index = 0;
  const suits = ["m", "p", "s"];
  const honors = ["E", "S", "W", "N", "P", "F", "C"];
  return [
    ...suits.flatMap((suit) => Array.from({ length: 9 }, (_, value) => ({ suit, value: value + 1 }))),
    ...honors.map((value) => ({ suit: "z", value })),
  ].flatMap((face) => Array.from({ length: 4 }, () => ({ ...face, copyId: `deck-${index++}` })));
}
