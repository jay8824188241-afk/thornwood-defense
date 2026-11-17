// Sound, synthesized live with WebAudio: no audio files, no network,
// nothing to load. Every effect is one short oscillator burst with a
// pitch slide, so the game answers every action with a sound at once.

const PRESETS = {
  shoot: { from: 660, to: 420, seconds: 0.07, type: 'square', gain: 0.05 },
  frost: { from: 880, to: 1200, seconds: 0.1, type: 'sine', gain: 0.05 },
  ember: { from: 220, to: 90, seconds: 0.16, type: 'sawtooth', gain: 0.07 },
  storm: { from: 1400, to: 300, seconds: 0.09, type: 'sawtooth', gain: 0.06 },
  hit: { from: 300, to: 180, seconds: 0.05, type: 'triangle', gain: 0.06 },
  kill: { from: 520, to: 780, seconds: 0.09, type: 'triangle', gain: 0.07 },
  coin: { from: 990, to: 1320, seconds: 0.08, type: 'sine', gain: 0.06 },
  leak: { from: 320, to: 110, seconds: 0.3, type: 'sawtooth', gain: 0.09 },
  build: { from: 440, to: 660, seconds: 0.1, type: 'triangle', gain: 0.08 },
  error: { from: 180, to: 120, seconds: 0.12, type: 'square', gain: 0.06 },
  wave: { from: 392, to: 523, seconds: 0.14, type: 'triangle', gain: 0.08 },
  win: { from: 523, to: 1046, seconds: 0.5, type: 'triangle', gain: 0.09 },
  lose: { from: 392, to: 98, seconds: 0.6, type: 'sawtooth', gain: 0.09 },
};

/** The sound board. Call `play(name)`; `muted` silences everything. */
export function createSoundBoard() {
  let context = null;
  let muted = false;

  function ensureContext() {
    if (context === null) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function play(name) {
    if (muted) return;
    const preset = PRESETS[name];
    if (!preset) return;
    const audio = ensureContext();
    if (!audio) return;
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = preset.type;
    oscillator.frequency.setValueAtTime(preset.from, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, preset.to), now + preset.seconds);
    gain.gain.setValueAtTime(preset.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.seconds);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + preset.seconds + 0.02);
  }

  return {
    play,
    get muted() { return muted; },
    set muted(value) { muted = Boolean(value); },
    toggleMuted() { muted = !muted; return muted; },
  };
}
