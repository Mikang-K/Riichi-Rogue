export function renderTutorialGuide(state, score) {
  return `
    <section class="tutorial-stage panel">
      <div class="tutorial-copy">
        <span class="label">튜토리얼</span>
        <h2>불필요한 패를 바꿔 완성 손패를 만들어 보세요</h2>
        <p>마작은 같은 그림 3장이나 같은 종류의 연속 숫자 3장으로 묶음을 만들고, 같은 패 2장짜리 머리를 더해 완성하는 게임입니다. 이 게임에서는 14장의 손패로 4묶음과 1머리를 만들면 조합을 제출할 수 있습니다.</p>
        <p>이번 연습 손패는 거의 완성되어 있습니다. 필요 없는 동을 선택해 교환하면 6통이 들어오고, 바로 완성 조합을 제출할 수 있습니다.</p>
      </div>
      <ol class="tutorial-steps">
        <li class="${state.discardsLeft === 1 ? "is-current" : "is-done"}">
          <strong>1. 필요 없는 패 고르기</strong>
          <span>동은 이번 연습 조합에 붙지 않습니다. 손패에서 동을 눌러 선택하세요.</span>
        </li>
        <li class="${state.discardsLeft === 0 && !score.isComplete ? "is-current" : state.discardsLeft === 0 ? "is-done" : ""}">
          <strong>2. 선택한 패 교환</strong>
          <span>선택한 패 교환을 누르면 선택한 패를 버리고 새 패를 받습니다. 튜토리얼에서는 다음 패가 6통으로 고정되어 있습니다.</span>
        </li>
        <li class="${score.isComplete ? "is-current" : ""}">
          <strong>3. 조합 제출</strong>
          <span>완성되면 조합 제출을 누르세요. 패 점수, 역 점수, 도라, 유물 보너스가 합산되어 목표 점수를 넘겼는지 확인합니다.</span>
        </li>
        <li class="${state.status === "tutorialComplete" ? "is-current" : ""}">
          <strong>4. 본 게임 진입</strong>
          <span>튜토리얼을 마치면 무작위 손패와 상점으로 진행되는 본 게임에 들어갈 수 있습니다.</span>
        </li>
      </ol>
    </section>
  `;
}
