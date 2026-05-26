const DEFAULT_SEED_PREFIX = "RR";

export function createRandomSeed() {
  const bytes = new Uint32Array(2);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    bytes[0] = Math.floor(Math.random() * 0xffffffff);
    bytes[1] = Date.now() >>> 0;
  }
  return `${DEFAULT_SEED_PREFIX}-${bytes[0].toString(36).padStart(6, "0")}-${bytes[1].toString(36).padStart(6, "0")}`.toUpperCase();
}

export function createSeededRng(seed = createRandomSeed()) {
  return {
    seed: String(seed),
    state: hashSeed(String(seed)),
    calls: 0,
  };
}

export function cloneRng(rng) {
  if (!rng) return null;
  return {
    seed: rng.seed,
    state: rng.state >>> 0,
    calls: rng.calls ?? 0,
  };
}

export function nextRandom(rng) {
  if (!rng) return Math.random();
  rng.state = (Math.imul(1664525, rng.state >>> 0) + 1013904223) >>> 0;
  rng.calls = (rng.calls ?? 0) + 1;
  return rng.state / 0x100000000;
}

export function randomId(rng, prefix = "id") {
  if (!rng && globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  const first = Math.floor(nextRandom(rng) * 0xffffffff).toString(36).padStart(7, "0");
  const second = Math.floor(nextRandom(rng) * 0xffffffff).toString(36).padStart(7, "0");
  return `${prefix}-${first}${second}`;
}

export function shuffleWithRng(items, rng = null) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom(rng) * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function takeWeightedItemWithRng(candidates, getWeight, rng = null) {
  const totalWeight = candidates.reduce((sum, item) => sum + getWeight(item), 0);
  let roll = nextRandom(rng) * totalWeight;
  for (const item of candidates) {
    roll -= getWeight(item);
    if (roll <= 0) return item;
  }
  return candidates.at(-1);
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 0x811c9dc5;
}
