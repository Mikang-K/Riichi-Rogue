import { renderTermText } from "./terms.js";

export function renderScore(score) {
  const yaku = score.yaku.length
    ? score.yaku.map((item) => `<li><span>${renderTermText(item.name)}</span><strong>${item.score}점</strong></li>`).join("")
    : `<li><span>${renderTermText(score.isComplete ? "역 없음" : "미완성 손패")}</span><strong>0점</strong></li>`;
  const relics = score.relicBonuses.length
    ? score.relicBonuses.map(renderRelicBonus).join("")
    : `<li><span>${renderTermText("발동한 유물 없음")}</span><strong>0점</strong></li>`;
  const augments = score.augmentBonuses.length
    ? score.augmentBonuses.map(renderAugmentBonus).join("")
    : "";

  return `
    <ul class="score-list">
      <li><span>${renderTermText("패 기본 점수")}</span><strong>${score.tileScore}점</strong></li>
      <li><span>${renderTermText("패 점수 보너스")}</span><strong>+${score.tileScoreBonus}점</strong></li>
      <li><span>${renderTermText("패 배율")}</span><strong>x${formatMultiplier(score.tileMultiplier)}</strong></li>
      ${yaku}
      <li><span>${renderTermText("도라")}</span><strong>${score.doraScore}점 (${score.regularDoraCount ?? score.doraCount}장${score.uraDoraCount ? `, ${renderTermText("뒷도라")} ${score.uraDoraCount}장` : ""})</strong></li>
      ${relics}
      ${augments}
      ${score.riichiMultiplierBonus ? `<li><span>${renderTermText("리치 보너스")}</span><strong>x+${formatMultiplier(score.riichiMultiplierBonus)}</strong></li>` : ""}
      <li><span>${renderTermText("역 배율")}</span><strong>x${formatMultiplier(score.yakuMultiplier)}</strong></li>
      <li><span>${renderTermText("완성 배율")}</span><strong>x${formatMultiplier(score.yakuCompletionMultiplier)}</strong></li>
      <li><span>${renderTermText("전체 배율")}</span><strong>x${formatMultiplier(score.globalMultiplier)}</strong></li>
      <li><span>${renderTermText("최종 점수")}</span><strong>${score.totalScore}점</strong></li>
    </ul>
  `;
}

export function renderRelicBonus(item) {
  return renderNamedBonus(item.relic.name, item.bonus);
}

export function renderAugmentBonus(item) {
  return renderNamedBonus(item.augment.name, item.bonus);
}

function renderNamedBonus(name, bonus) {
  const parts = [
    bonus.tileScoreBonus ? `패 점수 +${bonus.tileScoreBonus}` : "",
    bonus.yakuScoreBonus ? `역 점수 +${bonus.yakuScoreBonus}` : "",
    bonus.tileMultiplierBonus ? `패 배율 x+${formatMultiplier(bonus.tileMultiplierBonus)}` : "",
    bonus.yakuMultiplierBonus ? `역 배율 x+${formatMultiplier(bonus.yakuMultiplierBonus)}` : "",
    bonus.globalMultiplierBonus ? `전체 배율 x+${formatMultiplier(bonus.globalMultiplierBonus)}` : "",
  ].filter(Boolean);
  return `<li><span>${renderTermText(name)}</span><strong>${renderTermText(parts.join(", "))}</strong></li>`;
}

export function renderRelic(relic) {
  return `
    <div class="relic relic-${relic.rarity ?? "common"}">
      <div class="relic-title">
        <strong>${renderTermText(relic.name)}</strong>
        <small>${formatRarity(relic.rarity)}</small>
      </div>
      <span>${renderTermText(relic.text)}</span>
    </div>
  `;
}

export function renderAugment(augment) {
  return `
    <div class="relic augment relic-${augment.rarity ?? "common"}">
      <div class="relic-title">
        <strong>${renderTermText(augment.name)}</strong>
        <small>${formatRarity(augment.rarity)}</small>
      </div>
      <span>${renderTermText(augment.text)}</span>
    </div>
  `;
}

export function formatMultiplier(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatRarity(rarity = "common") {
  return {
    common: "일반",
    rare: "희귀",
    legendary: "전설",
  }[rarity] ?? "일반";
}
