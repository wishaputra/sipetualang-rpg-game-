import { state } from "./gameState.js";

export function ensureAudio() {
  if (state.audio || !window.AudioContext) return;

  const context = new AudioContext();
  if (context.state === "suspended") {
    context.resume();
  }
  const ambience = context.createOscillator();
  const ambienceGain = context.createGain();
  ambience.type = "sine";
  ambience.frequency.value = 58;
  ambienceGain.gain.value = 0.018;
  ambience.connect(ambienceGain);
  ambienceGain.connect(context.destination);
  ambience.start();
  state.audio = { context, ambienceGain };
}

export function playTone(frequency, duration = 0.12, type = "sine", volume = 0.04) {
  if (!state.audio) return;

  const { context } = state.audio;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.stop(context.currentTime + duration);
}

export function playFootstep() {
  const now = performance.now();
  if (now - state.lastFootstep < 260) return;
  state.lastFootstep = now;
  playTone(95, 0.055, "triangle", 0.018);
}
