export function renderTutorialGuide(state, score) {
  const step = getTutorialStep(state, score);
  const steps = [
    {
      id: "startReward",
      title: "1. 시작 유물 선택",
      text: "유물은 런 동안 계속 적용되는 강화입니다. 먼저 시작 유물을 하나 고르세요.",
    },
    {
      id: "selectDiscard",
      title: "2. 손패 확인과 패 선택",
      text: "손패는 4개의 묶음과 1개의 머리로 완성됩니다. 지금은 동 하나만 조합에 맞지 않습니다.",
    },
    {
      id: "exchange",
      title: "3. 선택한 패 교환",
      text: "동을 선택한 뒤 선택한 패 교환을 누르세요. 교환 횟수는 라운드마다 제한됩니다.",
    },
    {
      id: "submit",
      title: "4. 조합 제출",
      text: "완성된 손패는 조합 제출로 점수를 확정합니다. 목표 점수를 넘기면 라운드를 클리어합니다.",
    },
    {
      id: "shopIntro",
      title: "5. 상점 확인",
      text: "라운드를 클리어하면 코인을 받고 상점에 들어갑니다. 왼쪽은 유물과 증강, 오른쪽은 패 편집입니다.",
    },
    {
      id: "shopEdit",
      title: "6. 패 강화",
      text: "강화 후보 3개 중 하나를 골라 보세요. 강화된 패는 다음 라운드 점수 계산에 반영됩니다.",
    },
    {
      id: "nextRound",
      title: "7. 다음 라운드",
      text: "패를 강화했다면 다음 라운드를 눌러 튜토리얼을 마무리하세요.",
    },
    {
      id: "complete",
      title: "8. 본 게임 준비 완료",
      text: "한 라운드를 클리어하고 상점에서 덱을 바꾸는 흐름을 익혔습니다.",
    },
  ];

  return `
    <section class="tutorial-stage panel">
      <div class="tutorial-copy">
        <span class="label">튜토리얼</span>
        <h2>${getTutorialHeading(step)}</h2>
        <p>${getTutorialBody(state, score, step)}</p>
      </div>
      <ol class="tutorial-steps">
        ${steps.map((item) => `
          <li class="${getStepClass(steps, item.id, step)}">
            <strong>${item.title}</strong>
            <span>${item.text}</span>
          </li>
        `).join("")}
      </ol>
    </section>
  `;
}

function getTutorialStep(state, score) {
  if (state.status === "tutorialComplete") return "complete";
  if (state.status === "startReward") return "startReward";
  if (state.status === "shop") {
    if (state.tutorial?.hasEditedTile) return "nextRound";
    return state.tutorial?.hasVisitedShop ? "shopEdit" : "shopIntro";
  }
  if (state.status === "tutorial") {
    if (score.isComplete) return "submit";
    if (state.discardsLeft === 0) return "submit";
    if (state.selected.length > 0) return "exchange";
    return "selectDiscard";
  }
  return state.tutorial?.step ?? "startReward";
}

function getTutorialHeading(step) {
  return {
    startReward: "유물을 고르고 연습국을 시작하세요",
    selectDiscard: "손패에서 조합에 맞지 않는 패를 찾으세요",
    exchange: "선택한 패를 교환하세요",
    submit: "완성된 조합을 제출하세요",
    shopIntro: "코인을 받고 상점에 들어왔습니다",
    shopEdit: "상점에서 패를 강화해 보세요",
    nextRound: "다음 라운드로 넘어가세요",
    complete: "튜토리얼 완료",
  }[step] ?? "튜토리얼";
}

function getTutorialBody(state, score, step) {
  if (step === "startReward") {
    return "시작 유물은 이번 런 내내 유지됩니다. 마음에 드는 유물을 하나 선택하면 고정된 연습 손패로 시작합니다.";
  }
  if (step === "selectDiscard") {
    return "현재 손패는 거의 완성되어 있습니다. 동은 조합에 붙지 않으니 동을 선택하세요.";
  }
  if (step === "exchange") {
    return "선택한 패 교환을 누르면 동을 버리고 6통을 받습니다. 이번 연습국의 교환 횟수는 1회입니다.";
  }
  if (step === "submit") {
    return `현재 점수는 ${score.totalScore}점입니다. 목표 ${state.mode === "tutorial" ? 100 : 0}점을 넘겼다면 조합 제출로 라운드를 클리어할 수 있습니다.`;
  }
  if (step === "shopIntro" || step === "shopEdit") {
    return "상점에서는 유물과 증강을 살 수 있고, 패 풀의 패를 강화·추가·삭제할 수 있습니다. 이번에는 강화 후보 중 하나를 선택해 보세요.";
  }
  if (step === "nextRound") {
    return "좋습니다. 강화된 패는 패 풀에 남아 다음 라운드 점수 계산에 반영됩니다. 다음 라운드를 눌러 흐름을 마무리하세요.";
  }
  return "이제 본 게임에서 시작 유물을 고르고, 라운드를 클리어하고, 상점에서 덱을 바꾸는 흐름을 반복하면 됩니다.";
}

function getStepClass(steps, id, current) {
  const currentIndex = steps.findIndex((item) => item.id === current);
  const itemIndex = steps.findIndex((item) => item.id === id);
  if (itemIndex === currentIndex) return "is-current";
  if (itemIndex < currentIndex) return "is-done";
  return "";
}
