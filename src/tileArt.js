const COLS = 7;
const ROWS = 9;

const numberSpots = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
  7: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 2]],
  8: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]],
  9: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
};

const honorGlyphs = {
  E: [
    ".xxx.",
    ".x...",
    ".xxx.",
    ".x...",
    ".xxx.",
    ".....",
    ".....",
  ],
  S: [
    ".xxx.",
    ".x...",
    ".xxx.",
    "...x.",
    ".xxx.",
    ".....",
    ".....",
  ],
  W: [
    ".x.x.",
    ".x.x.",
    ".x.x.",
    ".xxx.",
    ".x.x.",
    ".....",
    ".....",
  ],
  N: [
    ".x.x.",
    ".xxx.",
    ".xxx.",
    ".xxx.",
    ".x.x.",
    ".....",
    ".....",
  ],
  P: [
    ".xxx.",
    ".x.x.",
    ".xxx.",
    ".x...",
    ".x...",
    ".....",
    ".....",
  ],
  F: [
    ".xxx.",
    ".x...",
    ".xxx.",
    ".x...",
    ".x...",
    ".....",
    ".....",
  ],
  C: [
    ".xxx.",
    ".x...",
    ".x...",
    ".x...",
    ".xxx.",
    ".....",
    ".....",
  ],
};

const honorColors = {
  E: "ink",
  S: "ink",
  W: "ink",
  N: "ink",
  P: "ink",
  F: "green",
  C: "red",
};

export function renderTileFace(tile) {
  const pixels = tile.suit === "z" ? renderHonor(tile.value) : renderNumberTile(tile.suit, tile.value);
  return `
    <span class="tile-face tile-face-${tile.suit}" aria-hidden="true">
      ${pixels.map((color) => `<span class="tile-pixel ${color ? `tile-pixel-${color}` : ""}"></span>`).join("")}
    </span>
  `;
}

function renderNumberTile(suit, value) {
  const pixels = emptyPixels();
  const color = suitColor(suit);
  for (const [spotRow, spotCol] of numberSpots[value] ?? []) {
    const row = 1 + spotRow * 3;
    const col = 1 + spotCol * 2;
    drawSuitMark(pixels, suit, row, col, color);
  }
  return pixels;
}

function renderHonor(value) {
  const pixels = emptyPixels();
  const glyph = honorGlyphs[value] ?? honorGlyphs.E;
  const color = honorColors[value] ?? "ink";
  glyph.forEach((line, row) => {
    [...line].forEach((cell, col) => {
      if (cell === "x") setPixel(pixels, row + 1, col + 1, color);
    });
  });
  return pixels;
}

function drawSuitMark(pixels, suit, row, col, color) {
  if (suit === "p") {
    setPixel(pixels, row - 1, col, color);
    setPixel(pixels, row, col - 1, color);
    setPixel(pixels, row, col + 1, color);
    setPixel(pixels, row + 1, col, color);
    return;
  }

  if (suit === "s") {
    setPixel(pixels, row - 1, col, color);
    setPixel(pixels, row, col, color);
    setPixel(pixels, row + 1, col, color);
    setPixel(pixels, row, col - 1, "ink");
    setPixel(pixels, row, col + 1, "ink");
    return;
  }

  setPixel(pixels, row - 1, col, color);
  setPixel(pixels, row, col - 1, color);
  setPixel(pixels, row, col, color);
  setPixel(pixels, row, col + 1, color);
  setPixel(pixels, row + 1, col, color);
}

function suitColor(suit) {
  if (suit === "m") return "red";
  if (suit === "p") return "blue";
  return "green";
}

function emptyPixels() {
  return Array.from({ length: COLS * ROWS }, () => "");
}

function setPixel(pixels, row, col, color) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
  pixels[row * COLS + col] = color;
}
