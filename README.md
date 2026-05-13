# Riichi Rogue

Riichi Rogue is a small browser roguelite prototype inspired by riichi mahjong and score-building games. The player draws a 14-tile hand, exchanges selected tiles within a limited number of discards, then submits the hand to beat the current stage score target.

## Current Gameplay

- Each stage has a `targetScore`.
- Every hand can be scored, even when it is not a complete mahjong hand.
- Number tiles score their face value.
- Honor tiles score `10` points.
- Complete hands can additionally earn yaku score and dora score.
- Relics can modify score through bonuses and multipliers.

The current score formula is:

```text
((tile score + tile score bonus) * tile multiplier
  + (yaku score + dora score + yaku score bonus) * yaku multiplier)
  * global multiplier
```

This means two broad build paths are supported:

- **Hand-completion builds**: complete the hand to earn yaku and dora score.
- **Tile-scaling builds**: use tile score, tile bonuses, and multipliers even with incomplete hands.

## Yaku Scoring

Yaku still keep their traditional han value as reference data, but stage clears use yaku score instead of han. Yaku score is intended to be balanced around completion difficulty: common yaku are worth less, difficult yaku are worth more.

The current starting values are defined in `src/game.js`:

| Yaku | Score |
| --- | ---: |
| Tanyao | 10 |
| Pinfu | 12 |
| Yakuhai | 12 |
| Chiitoitsu | 24 |
| Sanshoku Doujun | 28 |
| Toitoi | 30 |
| Honitsu | 42 |
| Chinitsu | 80 |

These values are balance placeholders and can later be replaced with values derived from simulation or playtest data.

## Relic Extension Model

Existing relics that return `score()` are still supported through a compatibility layer. New relics should prefer `effect()` so they can target a specific score channel:

```js
effect: ({ tiles, analysis, yaku, counts, doraCount }) => ({
  tileScoreBonus: 0,
  yakuScoreBonus: 0,
  tileMultiplierBonus: 0,
  yakuMultiplierBonus: 0,
  globalMultiplierBonus: 0,
})
```

Player-state relics can still use `player()` for effects such as changing the maximum discard count.

## Project Structure

```text
index.html          App entry point
scripts/serve.mjs   Small local static server
src/app.js          UI rendering and event binding
src/game.js         Game state, hand analysis, scoring, relics
src/styles.css      Application styling
```

## Running Locally

```bash
npm start
```

The app runs at:

```text
http://localhost:4173
```

Use a different port if needed:

```bash
PORT=5000 npm start
```

On Windows PowerShell:

```powershell
$env:PORT=5000; npm start
```

## Validation

Run the syntax check:

```bash
npm run check
```

This checks `src/game.js` and `src/app.js` with Node's parser.

## Notes

This project intentionally bends mahjong rules for roguelite scoring. Incomplete hands are allowed to score so future relics can support strategies based on tile enhancement, tile-specific multipliers, and non-yaku scaling.
