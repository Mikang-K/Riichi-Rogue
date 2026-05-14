const musicUrl = new URL("../music/Tiles_at_Dawn.mp3", import.meta.url).href;
const backgroundMusic = new Audio(musicUrl);

backgroundMusic.loop = true;
backgroundMusic.volume = 0.45;

let isStarted = false;

export function startBackgroundMusic({ muted } = {}) {
  if (muted) return;
  backgroundMusic.muted = false;
  const playPromise = backgroundMusic.play();
  isStarted = true;

  if (playPromise) {
    playPromise.catch(() => {
      isStarted = false;
    });
  }
}

export function pauseBackgroundMusic() {
  backgroundMusic.pause();
}

export function toggleBackgroundMusic({ muted }) {
  if (muted) {
    pauseBackgroundMusic();
    return;
  }
  startBackgroundMusic({ muted: false });
}

export function hasStartedBackgroundMusic() {
  return isStarted && !backgroundMusic.paused;
}
