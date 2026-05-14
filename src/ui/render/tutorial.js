export function renderTutorialGuide(state, score) {
  return `
    <section class="tutorial-stage panel">
      <div class="tutorial-copy">
        <span class="label">튜토리얼</span>
        <h2>한 장을 바꿔 완성 손패를 만들어 보세요</h2>
        <p>마작은 같은 그림 3장, 또는 같은 종류의 연속 숫자 3장을 모아 작은 묶음을 만드는 게임입니다. 이 게임에서는 손패 14장으로 묶음 4개와 같은 패 2장짜리 머리 1개를 만들면 제출할 수 있습니다.</p>
        <p>이번 연습 손패는 거의 완성되어 있습니다. 필요 없는 동을 선택해 교환하면 6통이 들어오고, 2통-3통-4통과 6통-6통 머리가 맞춰져 바로 화료할 수 있습니다.</p>
      </div>
      <ol class="tutorial-steps">
        <li class="${state.discardsLeft === 1 ? "is-current" : "is-done"}">
          <strong>1. 필요 없는 패 고르기</strong>
          <span>동은 숫자 패가 아니라 이번 연습 조합에 이어 붙일 수 없습니다. 손패에서 동을 클릭해 선택하세요.</span>
        </li>
        <li class="${state.discardsLeft === 0 && !score.isComplete ? "is-current" : state.discardsLeft === 0 ? "is-done" : ""}">
          <strong>2. 선택패 교환</strong>
          <span>선택패 교환을 누르면 선택한 패를 버리고 새 패를 받습니다. 튜토리얼에서는 다음 패가 6통으로 고정되어 있습니다.</span>
        </li>
        <li class="${score.isComplete ? "is-current" : ""}">
          <strong>3. 조합 제출</strong>
          <span>완성 후 조합 제출을 누르세요. 탕야오와 핑후라는 역 점수, 도라 점수, 유물 보너스가 더해져 목표 점수를 넘깁니다.</span>
        </li>
        <li class="${state.status === "tutorialComplete" ? "is-current" : ""}">
          <strong>4. 본 게임 진입</strong>
          <span>튜토리얼을 끝내면 무작위 손패로 시작하는 본 게임에 들어갈 수 있습니다.</span>
        </li>
      </ol>
    </section>
  `;
}
