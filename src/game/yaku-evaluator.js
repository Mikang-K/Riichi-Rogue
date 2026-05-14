import { createYaku, yakuDefinitions } from "./yaku-data.js";
import { excludedBy, standardYakuRules, tileYakuRules } from "./yaku-rules.js";

const definitionOrder = new Map(yakuDefinitions.map((item, index) => [item.id, index]));

export function evaluateYaku(tiles, analysis, context = {}) {
  const arrangements = analysis.arrangements ?? [];
  const standardArrangements = arrangements.filter((item) => item.type === "standard");
  const evaluationContext = {
    ...context,
    tiles,
    analysis,
    arrangements,
    standardArrangements,
  };
  const tileMatched = new Set();

  tileYakuRules.forEach(([id, predicate]) => {
    if (predicate(evaluationContext)) tileMatched.add(id);
  });

  const matched = mergeBestArrangementYaku(tileMatched, arrangements, standardArrangements, evaluationContext);
  applyExclusions(matched);

  return [...matched]
    .sort((a, b) => definitionOrder.get(a) - definitionOrder.get(b))
    .map(createYaku);
}

function mergeBestArrangementYaku(tileMatched, arrangements, standardArrangements, evaluationContext) {
  let best = new Set(tileMatched);
  let bestScore = scoreIds(best);

  arrangements
    .filter((arrangement) => arrangement.type === "sevenPairs")
    .forEach(() => {
      const candidate = new Set([...tileMatched, "chiitoitsu"]);
      const candidateScore = scoreIds(candidate);
      if (candidateScore > bestScore) {
        best = candidate;
        bestScore = candidateScore;
      }
    });

  standardArrangements.forEach((arrangement) => {
    const arrangementMatched = new Set(tileMatched);
    const arrangementContext = { ...evaluationContext, standardArrangements: [arrangement] };
    standardYakuRules.forEach(([id, predicate]) => {
      if (predicate(arrangementContext)) arrangementMatched.add(id);
    });

    const candidate = new Set(arrangementMatched);
    applyExclusions(candidate);
    const candidateScore = scoreIds(candidate);
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  });

  return best;
}

function applyExclusions(matched) {
  Object.entries(excludedBy).forEach(([winner, losers]) => {
    if (!matched.has(winner)) return;
    losers.forEach((loser) => matched.delete(loser));
  });
}

function scoreIds(ids) {
  return [...ids].reduce((sum, id) => {
    const definition = yakuDefinitions.find((item) => item.id === id);
    return sum + (definition?.score ?? 0);
  }, 0);
}
