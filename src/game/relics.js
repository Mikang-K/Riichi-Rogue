import relicData from "../data/relics.json" with { type: "json" };
import { relicEffectHandlers, relicPlayerEffectHandlers } from "./relic-effects.js";

export const relicRarities = {
  common: { label: "일반", weight: 70 },
  rare: { label: "희귀", weight: 25 },
  legendary: { label: "전설", weight: 5 },
};

function attachRelicHandlers(relic) {
  const effectHandler = relic.effect ? relicEffectHandlers[relic.effect.type] : undefined;
  const playerEffectHandler = relic.playerEffect ? relicPlayerEffectHandlers[relic.playerEffect.type] : undefined;

  if (relic.effect && !effectHandler) throw new Error(`Unknown relic effect type: ${relic.effect.type}`);
  if (relic.playerEffect && !playerEffectHandler) {
    throw new Error(`Unknown relic player effect type: ${relic.playerEffect.type}`);
  }

  return {
    ...relic,
    effect: effectHandler ? (context) => effectHandler({ relic, ...context }) : undefined,
    player: playerEffectHandler ? (player) => playerEffectHandler({ relic, player }) : undefined,
  };
}

export const relicPool = relicData.map(attachRelicHandlers);

