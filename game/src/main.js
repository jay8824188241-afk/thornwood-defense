// Thornwood Defense, the loop: read the URL, build the world, and either
// stage one screenshot scene (?shot=start|play|boss|end, with ?seed=)
// or run the game for a human. The loop runs on requestAnimationFrame
// and steps the world in fixed 1/30s slices, so the game plays the same
// at any frame rate; F fast-forwards at double speed.

import { createRandom } from './random.js';
import { createSoundBoard } from './audio.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { draw, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER, CANVAS_WIDTH, CANVAS_HEIGHT } from './render.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'thornwood-best';
const STEP = 1 / 30;

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed')) || 1;
const shot = params.get('shot');
const random = createRandom(seed);
const sound = createSoundBoard();
const world = createWorld(random, sound);
const state = world.state;

try {
  state.best = Number(window.localStorage.getItem(BEST_KEY)) || 0;
} catch {
  state.best = 0;
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

function screenFor(state) {
  if (state.phase === 'title') return SCREEN_TITLE;
  if (state.phase === 'playing') return SCREEN_PLAY;
  return SCREEN_OVER;
}

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function saveBest() {
  if (state.score > state.best) {
    state.best = state.score;
    try {
      window.localStorage.setItem(BEST_KEY, String(state.best));
    } catch {
      // Private browsing or no storage: the best score just does not persist.
    }
  }
}

let paused = false;
let clock = 0;

const hooks = {
  startGame() {
    world.startGame();
    announce('Game started. Build towers, then send the first wave.');
  },
  restart() {
    saveBest();
    world.startGame();
    announce('New game. Build towers, then send the first wave.');
  },
  togglePause() {
    paused = !paused;
    announce(paused ? 'Paused.' : 'Resumed.');
  },
  toggleSpeed() {
    state.speed = state.speed === 2 ? 1 : 2;
  },
  toggleMute() {
    const muted = sound.toggleMuted();
    announce(muted ? 'Sound off.' : 'Sound on.');
  },
};

if (shot) {
  // A screenshot scene: stage the real rules, draw one frame, stop.
  // No sound, no loop, no input: the frame is the same every run.
  const silent = { play() {} };
  const shotWorld = createWorld(createRandom(seed), silent);
  const staged = stageShot(shot, shotWorld);
  window.__thornwood = { world: shotWorld, state: shotWorld.state, shot };
  draw(ctx, shotWorld.state, staged.screen, 2);
  announce(shot === 'start' ? 'Thornwood Defense title screen.' : 'Thornwood Defense gameplay.');
} else {
  createInput(canvas, world, hooks);
  window.__thornwood = { world, state, hooks };
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (!paused) {
      accumulator += elapsed * state.speed;
      while (accumulator >= STEP) {
        clock += STEP;
        accumulator -= STEP;
        world.step(STEP, clock);
        if (state.phase === 'victory' || state.phase === 'defeat') saveBest();
      }
    }
    draw(ctx, state, screenFor(state), clock);
    requestAnimationFrame(frame);
  }

  world.reset();
  announce('Thornwood Defense. Press Enter or click to start.');
  requestAnimationFrame(frame);
}
