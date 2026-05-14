import { countTiles, keyOf, parseKey } from "./tile-utils.js";

export function analyzeHand(tiles) {
  const counts = countTiles(tiles);
  const arrangements = [
    ...findStandardArrangements(counts),
    ...findSevenPairArrangements(counts, tiles.length),
    ...findKokushiArrangements(counts, tiles.length),
  ];
  const standard = arrangements.find((item) => item.type === "standard");
  const primary = standard ?? arrangements[0] ?? { type: "none", melds: [], pair: null };

  return {
    isComplete: arrangements.length > 0,
    type: primary.type,
    melds: primary.melds ?? [],
    pair: primary.pair ?? null,
    arrangements,
  };
}

function findKokushiArrangements(counts, tileCount) {
  const required = ["m1", "m9", "p1", "p9", "s1", "s9", "zE", "zS", "zW", "zN", "zP", "zF", "zC"];
  if (tileCount !== 14) return [];
  if (!required.every((key) => (counts.get(key) ?? 0) >= 1)) return [];
  if (!required.some((key) => (counts.get(key) ?? 0) >= 2)) return [];
  if ([...counts.keys()].some((key) => !required.includes(key))) return [];
  return [{ type: "kokushi", melds: [], pair: null, terminalsAndHonors: required }];
}

function findSevenPairArrangements(counts, tileCount) {
  const pairs = [...counts.entries()].filter(([, count]) => count === 2).map(([key]) => key);
  if (tileCount !== 14 || pairs.length !== 7) return [];
  return [{ type: "sevenPairs", melds: [], pair: null, pairs }];
}

function findStandardArrangements(counts) {
  const arrangements = [];
  for (const pairKey of [...counts.keys()].sort(compareKeys)) {
    if ((counts.get(pairKey) ?? 0) < 2) continue;
    const nextCounts = new Map(counts);
    nextCounts.set(pairKey, nextCounts.get(pairKey) - 2);
    findAllMelds(nextCounts).forEach((melds) => {
      arrangements.push({ type: "standard", melds, pair: pairKey });
    });
  }
  return dedupeArrangements(arrangements);
}

function findAllMelds(counts, melds = []) {
  const current = [...counts.entries()].filter(([, count]) => count > 0).sort(([a], [b]) => compareKeys(a, b))[0];
  if (!current) return [melds];

  const [key, count] = current;
  const tile = parseKey(key);
  const results = [];

  if (count >= 3) {
    const tripletCounts = new Map(counts);
    tripletCounts.set(key, count - 3);
    results.push(...findAllMelds(tripletCounts, [...melds, { type: "triplet", tiles: [tile, tile, tile] }]));
  }

  if (tile.suit !== "z" && tile.value <= 7) {
    const keys = [key, `${tile.suit}${tile.value + 1}`, `${tile.suit}${tile.value + 2}`];
    if (keys.every((item) => (counts.get(item) ?? 0) > 0)) {
      const sequenceCounts = new Map(counts);
      keys.forEach((item) => sequenceCounts.set(item, sequenceCounts.get(item) - 1));
      results.push(...findAllMelds(sequenceCounts, [
        ...melds,
        { type: "sequence", tiles: keys.map(parseKey) },
      ]));
    }
  }

  return results;
}

function dedupeArrangements(arrangements) {
  const seen = new Set();
  return arrangements.filter((arrangement) => {
    const signature = arrangement.type === "sevenPairs"
      ? `seven:${arrangement.pairs.join(",")}`
      : `standard:${arrangement.pair}:${arrangement.melds.map(meldSignature).sort().join("|")}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function meldSignature(meld) {
  return `${meld.type}:${meld.tiles.map(keyOf).join("")}`;
}

function compareKeys(a, b) {
  const order = { m: 0, p: 1, s: 2, z: 3 };
  const tileA = parseKey(a);
  const tileB = parseKey(b);
  return order[tileA.suit] - order[tileB.suit] || compareValues(tileA.value, tileB.value);
}

function compareValues(a, b) {
  const order = { E: 1, S: 2, W: 3, N: 4, P: 5, F: 6, C: 7 };
  return (order[a] ?? a) - (order[b] ?? b);
}
