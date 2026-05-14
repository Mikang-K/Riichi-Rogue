export const SUITS = ["m", "p", "s"];
export const HONORS = ["E", "S", "W", "N", "P", "F", "C"];
export const WINDS = ["E", "S", "W", "N"];
export const DRAGONS = ["P", "F", "C"];

export function keyOf(tile) {
  return `${tile.suit}${tile.value}`;
}

export function parseKey(key) {
  const suit = key[0];
  const raw = key.slice(1);
  return { suit, value: suit === "z" ? raw : Number(raw) };
}

export function sameFace(a, b) {
  return a.suit === b.suit && a.value === b.value;
}

export function countTiles(tiles) {
  const counts = new Map();
  tiles.forEach((tile) => counts.set(keyOf(tile), (counts.get(keyOf(tile)) ?? 0) + 1));
  return counts;
}

export function sortTiles(tiles) {
  const suitOrder = { m: 0, p: 1, s: 2, z: 3 };
  return [...tiles].sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit] || compareValue(a.value, b.value));
}

export function compareValue(a, b) {
  const order = { E: 1, S: 2, W: 3, N: 4, P: 5, F: 6, C: 7 };
  return (order[a] ?? a) - (order[b] ?? b);
}

export function isHonor(tile) {
  return tile.suit === "z";
}

export function isDragon(tile) {
  return tile.suit === "z" && DRAGONS.includes(tile.value);
}

export function isTerminal(tile) {
  return tile.suit !== "z" && (tile.value === 1 || tile.value === 9);
}

export function isSimple(tile) {
  return tile.suit !== "z" && tile.value >= 2 && tile.value <= 8;
}

export function isTerminalOrHonor(tile) {
  return isTerminal(tile) || isHonor(tile);
}

export function isGreen(tile) {
  return (tile.suit === "s" && [2, 3, 4, 6, 8].includes(tile.value)) || (tile.suit === "z" && tile.value === "F");
}

export function meldKey(meld) {
  const first = meld.tiles[0];
  return meld.type === "sequence" ? `${first.suit}${first.value}` : keyOf(first);
}

export function groupHasTerminalOrHonor(group) {
  return group.tiles.some(isTerminalOrHonor);
}

export function groupHasTerminal(group) {
  return group.tiles.some(isTerminal);
}
