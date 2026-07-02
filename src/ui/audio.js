const musicUrl = new URL("../music/Tiles_at_Dawn.mp3", import.meta.url).href;
const backgroundMusic = new Audio(musicUrl);

backgroundMusic.loop = true;
backgroundMusic.volume = 0.45;

let isStarted = false;
let audioContext = null;

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

export function playSfx(name, { muted } = {}) {
  if (muted) return;
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const now = context.currentTime;
  switch (name) {
    case "tile-select":
      playTone(context, { start: now, frequency: 560, endFrequency: 640, duration: 0.045, type: "triangle", volume: 0.055 });
      break;
    case "exchange":
      playTone(context, { start: now, frequency: 420, endFrequency: 620, duration: 0.09, type: "triangle", volume: 0.12 });
      playTone(context, { start: now + 0.055, frequency: 760, duration: 0.07, type: "sine", volume: 0.08 });
      break;
    case "riichi":
      playTone(context, { start: now, frequency: 392, duration: 0.08, type: "sine", volume: 0.09 });
      playTone(context, { start: now + 0.08, frequency: 587.33, duration: 0.12, type: "triangle", volume: 0.1 });
      break;
    case "kan":
      playTone(context, { start: now, frequency: 180, endFrequency: 260, duration: 0.12, type: "square", volume: 0.08 });
      playTone(context, { start: now + 0.06, frequency: 720, duration: 0.08, type: "triangle", volume: 0.075 });
      break;
    case "shop-buy":
      playTone(context, { start: now, frequency: 659.25, duration: 0.07, type: "sine", volume: 0.08 });
      playTone(context, { start: now + 0.07, frequency: 880, duration: 0.1, type: "triangle", volume: 0.085 });
      break;
    case "reroll":
      playTone(context, { start: now, frequency: 330, endFrequency: 520, duration: 0.07, type: "triangle", volume: 0.07 });
      playTone(context, { start: now + 0.045, frequency: 520, endFrequency: 330, duration: 0.07, type: "triangle", volume: 0.06 });
      break;
    case "submit-success":
      playTone(context, { start: now, frequency: 523.25, duration: 0.08, type: "sine", volume: 0.1 });
      playTone(context, { start: now + 0.08, frequency: 659.25, duration: 0.09, type: "sine", volume: 0.1 });
      playTone(context, { start: now + 0.17, frequency: 783.99, duration: 0.16, type: "triangle", volume: 0.11 });
      break;
    case "submit-fail":
      playTone(context, { start: now, frequency: 220, endFrequency: 165, duration: 0.18, type: "sawtooth", volume: 0.09 });
      break;
    default:
      break;
  }
}

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
}

function playTone(context, { start, frequency, endFrequency = frequency, duration, type, volume }) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const end = start + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), end);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}
