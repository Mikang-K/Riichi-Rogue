export function renderScore(score) {
  const yaku = score.yaku.length
    ? score.yaku.map((item) => `<li><span>${item.name}</span><strong>${item.score}점</strong></li>`).join("")
    : `<li><span>${score.isComplete ? "역 없음" : "미완성 손패"}</span><strong>0점</strong></li>`;
  const relics = score.relicBonuses.length
    ? score.relicBonuses.map(renderRelicBonus).join("")
    : `<li><span>발동 유물 없음</span><strong>0점</strong></li>`;

  return `
    <ul class="score-list">
      <li><span>패 기본 점수</span><strong>${score.tileScore}점</strong></li>
      <li><span>패 점수 보너스</span><strong>+${score.tileScoreBonus}점</strong></li>
      <li><span>패 배수</span><strong>x${formatMultiplier(score.tileMultiplier)}</strong></li>
      ${yaku}
      <li><span>도라</span><strong>${score.doraScore}점 (${score.regularDoraCount ?? score.doraCount}장${score.uraDoraCount ? `, 뒷도라 ${score.uraDoraCount}장` : ""})</strong></li>
      ${relics}
      ${score.riichiMultiplierBonus ? `<li><span>리치 보너스</span><strong>x+${formatMultiplier(score.riichiMultiplierBonus)}</strong></li>` : ""}
      <li><span>역 배수</span><strong>x${formatMultiplier(score.yakuMultiplier)}</strong></li>
      <li><span>역 완성 배수</span><strong>x${formatMultiplier(score.yakuCompletionMultiplier)}</strong></li>
      <li><span>전체 배수</span><strong>x${formatMultiplier(score.globalMultiplier)}</strong></li>
      <li><span>최종 점수</span><strong>${score.totalScore}점</strong></li>
    </ul>
  `;
}

export function renderRelicBonus(item) {
  const bonus = item.bonus;
  const parts = [
    bonus.tileScoreBonus ? `패 +${bonus.tileScoreBonus}` : "",
    bonus.yakuScoreBonus ? `역 +${bonus.yakuScoreBonus}` : "",
    bonus.tileMultiplierBonus ? `패 x+${formatMultiplier(bonus.tileMultiplierBonus)}` : "",
    bonus.yakuMultiplierBonus ? `역 x+${formatMultiplier(bonus.yakuMultiplierBonus)}` : "",
    bonus.globalMultiplierBonus ? `전체 x+${formatMultiplier(bonus.globalMultiplierBonus)}` : "",
  ].filter(Boolean);
  return `<li><span>${item.relic.name}</span><strong>${parts.join(", ")}</strong></li>`;
}

export function renderRelic(relic) {
  return `
    <div class="relic relic-${relic.rarity ?? "common"}">
      <div class="relic-title">
        <strong>${relic.name}</strong>
        <small>${formatRarity(relic.rarity)}</small>
      </div>
      <span>${relic.text}</span>
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
