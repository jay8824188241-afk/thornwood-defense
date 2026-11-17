// The screenshot scenes behind ?shot=start|play|boss|end. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// so the frame is what a real game looks like and the same seed always
// gives the same frame. The play scene plays the first two waves fast,
// spends the earnings on more towers, then stages the third wave in the
// middle of the fight; the boss scene jumps to the tenth wave with a
// stronger defence; the end scene plays the final wave through to victory
// with a maxed-out defence.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { roadsideCells, isBuildable } from './world.js';
import { TOWERS, TOWER_ORDER } from './config.js';
import { createRandom } from './random.js';

const STEP = 1 / 30;
const PLAY_SECONDS = 14;
const BOSS_SECONDS = 16;
const END_LIMIT_SECONDS = 300;
const WAVE_LIMIT_SECONDS = 150;
const random = createRandom(7);

/** Step the world forward `seconds` of game time, or until `done` says stop. */
function runFor(world, seconds, done) {
  let clock = 0;
  for (let index = 0; index < seconds / STEP; index += 1) {
    clock += STEP;
    world.step(STEP, clock);
    if (done && done()) break;
  }
  return clock;
}

/** Spend the earnings between waves the way a player would: upgrade everything, then build more towers. */
function spendEarnings(world) {
  const state = world.state;
  for (const tower of [...state.towers]) world.upgradeTower(tower);
  for (const cell of roadsideCells(random)) {
    if (state.towers.length >= 12 || state.gold < 50) break;
    const kind = TOWER_ORDER[state.towers.length % TOWER_ORDER.length];
    if (state.gold >= TOWERS[kind].cost && isBuildable(state, cell.col, cell.row)) world.placeTower(kind, cell.col, cell.row);
  }
  for (const tower of [...state.towers]) world.upgradeTower(tower);
}

/** Set `world` to the named scene and return the screen to draw over it. */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'boss' && name !== 'end') {
    return { screen: SCREEN_TITLE, best: 0 };
  }
  world.startGame();
  if (name === 'play') {
    world.autoPlace();
    for (let wave = 1; wave <= 2; wave += 1) {
      world.startWave();
      runFor(world, WAVE_LIMIT_SECONDS, () => !world.state.waveActive);
      if (world.state.phase !== 'playing') break;
      spendEarnings(world);
    }
    if (world.state.phase === 'playing') {
      world.startWave();
      runFor(world, PLAY_SECONDS);
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'boss') {
    world.state.gold += 900;
    world.autoPlace();
    for (const tower of [...world.state.towers]) {
      world.upgradeTower(tower);
      world.upgradeTower(tower);
    }
    world.state.wave = 9;
    world.startWave();
    runFor(world, BOSS_SECONDS);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  world.state.gold += 2600;
  world.autoPlace();
  for (const tower of [...world.state.towers]) {
    world.upgradeTower(tower);
    world.upgradeTower(tower);
  }
  world.state.wave = 11;
  world.startWave();
  runFor(world, END_LIMIT_SECONDS, () => world.state.phase !== 'playing');
  return { screen: SCREEN_OVER, best: world.state.score };
}
