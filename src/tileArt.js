const tileImageFiles = {
  m1: "man_1.png",
  m2: "man_2.png",
  m3: "man_3.png",
  m4: "man_4.png",
  m5: "man_5.png",
  m6: "man_6.png",
  m7: "man_7.png",
  m8: "man_8.png",
  m9: "man_9.png",
  p1: "pin_1.png",
  p2: "pin_2.png",
  p3: "pin_3.png",
  p4: "pin_4.png",
  p5: "pin_5.png",
  p6: "pin_6.png",
  p7: "pin_7.png",
  p8: "pin_8.png",
  p9: "pin_9.png",
  s1: "sou_1.png",
  s2: "sou_2.png",
  s3: "sou_3.png",
  s4: "sou_4.png",
  s5: "sou_5.png",
  s6: "sou_6.png",
  s7: "sou_7.png",
  s8: "sou_8.png",
  s9: "sou_9.png",
  zE: "wind_east.png",
  zS: "wind_south.png",
  zW: "wind_west.png",
  zN: "wind_north.png",
  zP: "dragon_white.png",
  zF: "dragon_green.png",
  zC: "dragon_red.png",
};

export function renderTileFace(tile) {
  const imageSrc = getTileImageSrc(tile);

  return `
    <span class="tile-face tile-face-${tile.suit}" aria-hidden="true">
      <img class="tile-image" src="${imageSrc}" alt="" draggable="false" />
    </span>
  `;
}

function getTileImageSrc(tile) {
  const fileName = tileImageFiles[tileKey(tile)] ?? tileImageFiles.zP;
  return new URL(`./source/${fileName}`, import.meta.url).href;
}

function tileKey(tile) {
  return `${tile.suit}${tile.value}`;
}
