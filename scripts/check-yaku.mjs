import { scoreHand, newTutorial, exchangeSelected } from "../src/game.js";

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

console.log(`Yaku checks passed: ${cases.length + 1}`);

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
