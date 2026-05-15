import augmentData from "../data/augments.json" with { type: "json" };
import { augmentEffectHandlers } from "./augment-effects.js";
import { relicRarities } from "./relics.js";

export const augmentRarities = relicRarities;

function attachAugmentHandlers(augment) {
  const effectHandler = augment.effect ? augmentEffectHandlers[augment.effect.type] : undefined;

  if (augment.effect && !effectHandler) throw new Error(`Unknown augment effect type: ${augment.effect.type}`);

  return {
    ...augment,
    effect: effectHandler ? (context) => effectHandler({ augment, ...context }) : undefined,
  };
}

export const augmentPool = augmentData.map(attachAugmentHandlers);
