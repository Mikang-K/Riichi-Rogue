export const rogueYakuDefinitions = [
  {
    id: "rogue-thin-wall",
    name: "얇은 패산",
    han: 1,
    score: 16,
    text: "플레이어 패 풀이 14장보다 적은 상태에서 완성 손패를 제출하면 성립합니다.",
  },
  {
    id: "rogue-fivefold-face",
    name: "오중 울림",
    han: 2,
    score: 28,
    text: "완성 손패에 같은 얼굴의 패가 5장 이상 있으면 성립합니다.",
  },
  {
    id: "rogue-sixfold-face",
    name: "육중 울림",
    han: 3,
    score: 42,
    text: "완성 손패에 같은 얼굴의 패가 6장 이상 있으면 성립합니다.",
  },
];

export const rogueYakuReference = rogueYakuDefinitions
  .slice()
  .sort((a, b) => a.han - b.han || a.score - b.score || a.name.localeCompare(b.name, "ko"))
  .map((item) => ({
    name: item.name,
    han: `${item.han}판`,
    score: item.score,
    text: item.text,
  }));

export function createRogueYaku(id) {
  const definition = rogueYakuDefinitions.find((item) => item.id === id);
  if (!definition) throw new Error(`Unknown rogue yaku id: ${id}`);
  return {
    id: definition.id,
    name: definition.name,
    han: definition.han,
    score: definition.score,
    text: definition.text,
    rogue: true,
  };
}
