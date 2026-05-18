export function renderMusicControl(isMuted) {
  const label = isMuted ? "배경 음악 켜기" : "배경 음악 끄기";
  return `
    <button
      class="music-button ${isMuted ? "is-muted" : ""}"
      data-action="toggle-music"
      aria-pressed="${!isMuted}"
      aria-label="${label}"
      title="${label}"
    >
      ${isMuted ? "음악 꺼짐" : "음악 켜짐"}
    </button>
  `;
}
