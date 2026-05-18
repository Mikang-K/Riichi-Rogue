const tutorialSteps = [
  {
    id: "startReward",
    target: "start-reward",
    title: "시작 보상을 고르세요",
    body: "보상 카드를 하나 선택하면 연습국이 시작됩니다. 선택한 보상은 이번 진행 동안 계속 적용됩니다.",
  },
  {
    id: "selectDiscard",
    target: "discard-tile",
    title: "동을 선택하세요",
    body: "손패는 거의 완성되어 있습니다. 조합에 맞지 않는 동을 눌러 교환 대상으로 지정하세요.",
  },
  {
    id: "exchange",
    target: "exchange-button",
    title: "선택한 패를 교환하세요",
    body: "교환 버튼을 누르면 선택한 패를 버리고 새 패를 받습니다. 이번 연습국의 교환 횟수는 1회입니다.",
  },
  {
    id: "submit",
    target: "submit-button",
    title: "조합을 제출하세요",
    body: "현재 손패가 목표 점수를 넘겼습니다. 조합 제출로 라운드를 클리어하세요.",
  },
  {
    id: "shopEdit",
    target: "upgrade-offer",
    title: "상점에서 패를 강화하세요",
    body: "오른쪽 패 편집 영역의 강화 후보 3개 중 하나를 선택하세요. 강화된 패는 다음 계산부터 더 높은 점수로 반영됩니다.",
  },
  {
    id: "nextRound",
    target: "leave-shop",
    title: "튜토리얼을 마무리하세요",
    body: "패 강화가 완료되었습니다. 튜토리얼 완료 버튼을 눌러 본 게임으로 넘어갈 준비를 마치세요.",
  },
  {
    id: "complete",
    target: null,
    title: "튜토리얼 완료",
    body: "이제 보상을 고르고, 라운드를 클리어하고, 상점에서 덱을 다듬는 기본 흐름을 익혔습니다.",
  },
];

export function renderTutorialCoach(state, score) {
  const step = getTutorialStep(state, score);
  const meta = getTutorialStepMeta(step);
  const index = tutorialSteps.findIndex((item) => item.id === meta.id);
  const progress = `${Math.max(index + 1, 1)}/${tutorialSteps.length}`;

  return `
    <aside class="tutorial-coach-overlay" aria-live="polite">
      <div class="tutorial-coach-card">
        <span class="label">튜토리얼 ${progress}</span>
        <h2>${meta.title}</h2>
        <p>${getTutorialBody(state, score, meta)}</p>
      </div>
    </aside>
  `;
}

export function getTutorialTarget(state, score) {
  return getTutorialStepMeta(getTutorialStep(state, score)).target;
}

export function getTutorialStep(state, score) {
  if (state.status === "tutorialComplete") return "complete";
  if (state.status === "startReward") return "startReward";
  if (state.status === "shop") {
    return state.tutorial?.hasEditedTile ? "nextRound" : "shopEdit";
  }
  if (state.status === "tutorial") {
    if (score?.isComplete) return "submit";
    if (state.discardsLeft === 0) return "submit";
    if (state.selected.length > 0) return "exchange";
    return "selectDiscard";
  }
  return state.tutorial?.step ?? "startReward";
}

export function isTutorialTargetActive(state, score, target) {
  return getTutorialTarget(state, score) === target;
}

function getTutorialStepMeta(step) {
  return tutorialSteps.find((item) => item.id === step) ?? tutorialSteps[0];
}

function getTutorialBody(state, score, meta) {
  if (meta.id === "submit" && score) {
    return `현재 점수는 ${score.totalScore}점입니다. 목표 점수를 넘겼다면 조합 제출로 라운드를 클리어할 수 있습니다.`;
  }
  if (meta.id === "nextRound" && state.coins > 0) {
    return `좋습니다. 남은 코인은 ${state.coins}개입니다. 튜토리얼 완료 버튼을 눌러 마무리하세요.`;
  }
  return meta.body;
}
