export function renderMusicControl(isMuted) {
  return `
    <button
      class="music-button ${isMuted ? "is-muted" : ""}"
      data-action="toggle-music"
      aria-pressed="${!isMuted}"
      aria-label="${isMuted ? "배경음악 켜기" : "배경음악 끄기"}"
      title="${isMuted ? "배경음악 켜기" : "배경음악 끄기"}"
    >
      ${isMuted ? "BGM 꺼짐" : "BGM 켜짐"}
    </button>
  `;
}
