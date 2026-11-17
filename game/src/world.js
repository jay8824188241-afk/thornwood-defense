// Thornwood Defense, the rules: the field, the towers, the blight, the
// waves, the gold and the win and loss. Rendering never lives here;
// input never lives here. This module only moves the game forward one
// step at a time, so the screenshot scenes can play the real rules
// forward and get the same frame every time.

import {
  CELL, COLS, ROWS, PATH, HEARTWOOD, BLOCKED,
  START_GOLD, START_LIVES, WAVE_COUNT, WAVE_CLEAR_BONUS, SELL_RATE,
  TOWERS, ENEMIES, WAVES,
} from './config.js';

// The path as pixel waypoints, with the cell of each segment kept so the
// field knows which cells are road.
export const PATH_CELLS = (() => {
  const cells = new Set();
  const points = [];
  for (let i = 0; i < PATH.length - 1; i += 1) {
    const [c0, r0] = PATH[i];
    const [c1, r1] = PATH[i + 1];
    const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let s = 0; s <= steps; s += 1) {
      const col = c0 + Math.round(((c1 - c0) * s) / steps);
      const row = r0 + Math.round(((r1 - r0) * s) / steps);
      cells.add(`${col},${row}`);
      points.push({ x: (col + 0.5) * CELL, y: (row + 0.5) * CELL });
    }
  }
  points.push({ x: (HEARTWOOD.col + 0.5) * CELL, y: (HEARTWOOD.row + 0.5) * CELL });
  return { cells, points };
})();

const BLOCKED_CELLS = new Set(BLOCKED.map((b) => `${b.col},${b.row}`));
const HEARTWOOD_KEY = `${HEARTWOOD.col},${HEARTWOOD.row}`;

let nextId = 1;

function towerStats(kind, level) {
  const def = TOWERS[kind];
  return {
    damage: def.damage + def.upgradeDamage * (level - 1),
    range: def.range + def.upgradeRange * (level - 1),
  };
}

function enemyHealth(kind, wave) {
  return Math.round(ENEMIES[kind].hp * (1 + 0.22 * (wave - 1)));
}

/** A cell is buildable when it is inside the field and holds no road, no blocked feature, no Heartwood and no tower. */
export function isBuildable(state, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const key = `${col},${row}`;
  if (PATH_CELLS.cells.has(key) || BLOCKED_CELLS.has(key) || key === HEARTWOOD_KEY) return false;
  return !state.towers.some((tower) => tower.col === col && tower.row === row);
}

/** The cells beside the road, best first: corners of the path, then any roadside cell. Used by the autopilot. */
export function roadsideCells(random) {
  const scored = [];
  for (let col = 0; col < COLS; col += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const key = `${col},${row}`;
      if (PATH_CELLS.cells.has(key) || BLOCKED_CELLS.has(key) || key === HEARTWOOD_KEY) continue;
      let roadNeighbours = 0;
      let corner = 0;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        if (PATH_CELLS.cells.has(`${col + dc},${row + dr}`)) roadNeighbours += 1;
      }
      // A cell touching the road at a bend covers two stretches of it.
      if (PATH_CELLS.cells.has(`${col + 1},${row}`) && PATH_CELLS.cells.has(`${col},${row + 1}`)) corner += 1;
      if (PATH_CELLS.cells.has(`${col - 1},${row}`) && PATH_CELLS.cells.has(`${col},${row + 1}`)) corner += 1;
      if (PATH_CELLS.cells.has(`${col + 1},${row}`) && PATH_CELLS.cells.has(`${col},${row - 1}`)) corner += 1;
      if (PATH_CELLS.cells.has(`${col - 1},${row}`) && PATH_CELLS.cells.has(`${col},${row - 1}`)) corner += 1;
      if (roadNeighbours > 0) scored.push({ col, row, score: corner * 3 + roadNeighbours + random() * 0.5 });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function createWorld(random, sound) {
  const state = {
    phase: 'title',
    gold: START_GOLD,
    lives: START_LIVES,
    wave: 0,
    score: 0,
    kills: 0,
    earned: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    texts: [],
    bolts: [],
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    spawnedCount: 0,
    waveTotal: 0,
    selectedKind: null,
    selectedTower: null,
    hover: null,
    speed: 1,
    message: '',
    messageTimer: 0,
    best: 0,
  };

  function say(text, seconds = 2.2) {
    state.message = text;
    state.messageTimer = seconds;
  }

  function addText(x, y, text, color) {
    state.texts.push({ x, y, text, color, life: 1.0 });
  }

  function burst(x, y, color, count = 8, speed = 90) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const velocity = speed * (0.4 + random() * 0.8);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.5 + random() * 0.3,
        maxLife: 0.8,
        color,
        size: 2 + random() * 3,
      });
    }
  }

  function reset() {
    state.phase = 'title';
    state.gold = START_GOLD;
    state.lives = START_LIVES;
    state.wave = 0;
    state.score = 0;
    state.kills = 0;
    state.earned = 0;
    state.towers = [];
    state.enemies = [];
    state.projectiles = [];
    state.particles = [];
    state.texts = [];
    state.bolts = [];
    state.waveActive = false;
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.spawnedCount = 0;
    state.waveTotal = 0;
    state.selectedKind = null;
    state.selectedTower = null;
    state.hover = null;
    state.speed = 1;
    state.message = '';
    state.messageTimer = 0;
  }

  function startGame() {
    reset();
    state.phase = 'playing';
    say('Build towers, then send the first wave!');
  }

  function placeTower(kind, col, row) {
    const def = TOWERS[kind];
    if (!def) return false;
    if (!isBuildable(state, col, row)) { sound.play('error'); return false; }
    if (state.gold < def.cost) { sound.play('error'); say('Not enough gold for a ' + def.name); return false; }
    state.gold -= def.cost;
    state.towers.push({
      id: nextId += 1,
      kind,
      col, row,
      x: (col + 0.5) * CELL,
      y: (row + 0.5) * CELL,
      level: 1,
      invested: def.cost,
      cooldown: 0,
      flash: 0,
    });
    sound.play('build');
    return true;
  }

  function upgradeTower(tower) {
    const def = TOWERS[tower.kind];
    if (tower.level >= 3) { say('Already at max level'); return false; }
    const cost = def.upgradeCost * tower.level;
    if (state.gold < cost) { sound.play('error'); say('Not enough gold to upgrade'); return false; }
    state.gold -= cost;
    tower.invested += cost;
    tower.level += 1;
    tower.flash = 0.4;
    burst(tower.x, tower.y, '#ffd76a', 10, 70);
    sound.play('build');
    return true;
  }

  function sellTower(tower) {
    const refund = Math.floor(tower.invested * SELL_RATE);
    state.gold += refund;
    state.towers = state.towers.filter((t) => t.id !== tower.id);
    if (state.selectedTower === tower) state.selectedTower = null;
    addText(tower.x, tower.y - 14, `+$${refund}`, '#ffd76a');
    sound.play('coin');
    return refund;
  }

  function startWave() {
    if (state.waveActive || state.phase !== 'playing') return false;
    if (state.wave >= WAVE_COUNT) return false;
    state.wave += 1;
    const groups = WAVES[state.wave - 1];
    state.spawnQueue = [];
    for (const group of groups) {
      for (let i = 0; i < group.count; i += 1) state.spawnQueue.push({ kind: group.kind, delay: group.gap });
    }
    state.spawnTimer = 0.5;
    state.spawnedCount = 0;
    state.waveTotal = state.spawnQueue.length;
    state.waveActive = true;
    sound.play('wave');
    say(`Wave ${state.wave} of ${WAVE_COUNT} — hold the Heartwood!`);
    return true;
  }

  function spawnEnemy(kind) {
    const def = ENEMIES[kind];
    const start = PATH_CELLS.points[0];
    state.enemies.push({
      id: nextId += 1,
      kind,
      x: start.x,
      y: start.y,
      hp: enemyHealth(kind, state.wave),
      maxHp: enemyHealth(kind, state.wave),
      speed: def.speed,
      bounty: def.bounty,
      leak: def.leak,
      radius: def.radius,
      waypoint: 1,
      distance: 0,
      slowUntil: 0,
      slowFactor: 1,
      wobble: random() * Math.PI * 2,
    });
    state.spawnedCount += 1;
  }

  function killEnemy(enemy, awardGold = true) {
    state.enemies = state.enemies.filter((e) => e.id !== enemy.id);
    state.kills += 1;
    state.score += 10 + state.wave * 5;
    if (awardGold) {
      state.gold += enemy.bounty;
      state.earned += enemy.bounty;
      addText(enemy.x, enemy.y - 14, `+$${enemy.bounty}`, '#ffd76a');
    }
    burst(enemy.x, enemy.y, ENEMIES[enemy.kind].color, enemy.kind === 'brute' ? 22 : 10, 110);
    sound.play('kill');
    if (enemy.kind === 'brute') sound.play('coin');
  }

  function damageEnemy(enemy, damage, slow, slowSeconds, now) {
    enemy.hp -= damage;
    if (slow !== undefined) {
      enemy.slowFactor = Math.min(enemy.slowFactor, slow);
      enemy.slowUntil = Math.max(enemy.slowUntil, now + slowSeconds);
    }
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function fireStorm(tower, target, now) {
    const def = TOWERS.storm;
    const stats = towerStats('storm', tower.level);
    let current = target;
    let fromX = tower.x;
    let fromY = tower.y;
    const hit = new Set();
    for (let jump = 0; jump < def.chain && current; jump += 1) {
      hit.add(current.id);
      state.bolts.push({ x1: fromX, y1: fromY, x2: current.x, y2: current.y, life: 0.18 });
      damageEnemy(current, stats.damage, undefined, undefined, now);
      fromX = current.x;
      fromY = current.y;
      let next = null;
      let bestDistance = Infinity;
      for (const enemy of state.enemies) {
        if (hit.has(enemy.id)) continue;
        const dx = enemy.x - fromX;
        const dy = enemy.y - fromY;
        const distance = dx * dx + dy * dy;
        if (distance < 130 * 130 && distance < bestDistance) { bestDistance = distance; next = enemy; }
      }
      current = next;
    }
    tower.flash = 0.15;
    sound.play('storm');
  }

  function fireTower(tower, now) {
    const def = TOWERS[tower.kind];
    const stats = towerStats(tower.kind, tower.level);
    let target = null;
    for (const enemy of state.enemies) {
      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      if (dx * dx + dy * dy > stats.range * stats.range) continue;
      if (!target || enemy.distance > target.distance) target = enemy;
    }
    if (!target) return;
    tower.cooldown = 1 / def.rate;
    tower.flash = 0.12;
    if (tower.kind === 'storm') { fireStorm(tower, target, now); return; }
    state.projectiles.push({
      x: tower.x,
      y: tower.y - 6,
      target,
      damage: stats.damage,
      speed: def.projectileSpeed,
      splash: def.splash || 0,
      slow: def.slow,
      slowSeconds: def.slowSeconds || 0,
      color: def.color,
      kind: tower.kind,
    });
    sound.play(tower.kind === 'frost' ? 'frost' : tower.kind === 'ember' ? 'ember' : 'shoot');
  }

  function stepProjectiles(dt, now) {
    for (const projectile of [...state.projectiles]) {
      const target = projectile.target;
      if (!target || !state.enemies.includes(target)) {
        state.projectiles = state.projectiles.filter((p) => p !== projectile);
        continue;
      }
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const distance = Math.hypot(dx, dy);
      const move = projectile.speed * dt;
      if (distance <= move + target.radius) {
        if (projectile.splash > 0) {
          burst(target.x, target.y, '#ff9a3d', 12, 130);
          for (const enemy of [...state.enemies]) {
            const ex = enemy.x - target.x;
            const ey = enemy.y - target.y;
            if (ex * ex + ey * ey <= projectile.splash * projectile.splash) {
              damageEnemy(enemy, projectile.damage, projectile.slow, projectile.slowSeconds, now);
            }
          }
        } else {
          damageEnemy(target, projectile.damage, projectile.slow, projectile.slowSeconds, now);
          burst(target.x, target.y, projectile.color, 4, 60);
          sound.play('hit');
        }
        state.projectiles = state.projectiles.filter((p) => p !== projectile);
      } else {
        projectile.x += (dx / distance) * move;
        projectile.y += (dy / distance) * move;
      }
    }
  }

  function stepEnemies(dt, now) {
    for (const enemy of [...state.enemies]) {
      const def = ENEMIES[enemy.kind];
      const slowed = now < enemy.slowUntil;
      const speed = def.speed * (slowed ? enemy.slowFactor : 1);
      let remaining = speed * dt;
      while (remaining > 0 && enemy.waypoint < PATH_CELLS.points.length) {
        const point = PATH_CELLS.points[enemy.waypoint];
        const dx = point.x - enemy.x;
        const dy = point.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= remaining) {
          enemy.x = point.x;
          enemy.y = point.y;
          enemy.distance += distance;
          remaining -= distance;
          enemy.waypoint += 1;
        } else {
          enemy.x += (dx / distance) * remaining;
          enemy.y += (dy / distance) * remaining;
          enemy.distance += remaining;
          remaining = 0;
        }
      }
      if (enemy.waypoint >= PATH_CELLS.points.length) {
        state.enemies = state.enemies.filter((e) => e.id !== enemy.id);
        state.lives -= enemy.leak;
        burst(enemy.x, enemy.y, '#ff6b6b', 14, 120);
        sound.play('leak');
        say(enemy.kind === 'brute' ? 'A Brute broke through! -5 lives' : 'The blight reached the Heartwood! -1 life');
        if (state.lives <= 0) {
          state.lives = 0;
          state.phase = 'defeat';
          sound.play('lose');
        }
      }
    }
  }

  function stepSpawning(dt) {
    if (state.spawnQueue.length === 0) return;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const next = state.spawnQueue.shift();
      spawnEnemy(next.kind);
      state.spawnTimer = next.delay;
    }
  }

  function stepTowers(dt, now) {
    for (const tower of state.towers) {
      tower.cooldown -= dt;
      tower.flash = Math.max(0, tower.flash - dt);
      if (tower.cooldown <= 0) fireTower(tower, now);
    }
  }

  function stepParticles(dt) {
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const text of state.texts) {
      text.y -= 28 * dt;
      text.life -= dt * 0.9;
    }
    state.texts = state.texts.filter((t) => t.life > 0);
    for (const bolt of state.bolts) bolt.life -= dt;
    state.bolts = state.bolts.filter((b) => b.life > 0);
    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) state.message = '';
    }
  }

  /** Advance the game by `dt` seconds. Returns nothing; read state. */
  function step(dt, now) {
    if (state.phase !== 'playing') return;
    stepParticles(dt);
    if (state.waveActive) stepSpawning(dt);
    stepEnemies(dt, now);
    if (state.phase !== 'playing') return;
    stepTowers(dt, now);
    stepProjectiles(dt, now);
    if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
      state.waveActive = false;
      const bonus = WAVE_CLEAR_BONUS + state.wave * 5;
      state.gold += bonus;
      state.earned += bonus;
      state.score += 100 + state.wave * 25;
      sound.play('coin');
      if (state.wave >= WAVE_COUNT) {
        state.phase = 'victory';
        state.score += state.lives * 25 + state.gold;
        sound.play('win');
      } else {
        say(`Wave ${state.wave} cleared! +$${bonus} bonus. Send the next wave when ready.`);
      }
    }
  }

  /** The autopilot's opening: spend the starting gold on a sensible defence. */
  function autoPlace() {
    const cells = roadsideCells(random);
    const plan = ['thorn', 'thorn', 'frost', 'thorn', 'ember', 'vine', 'thorn', 'storm', 'frost', 'ember'];
    let placed = 0;
    for (const kind of plan) {
      if (state.gold < TOWERS[kind].cost) continue;
      const cell = cells[placed % cells.length];
      if (placeTower(kind, cell.col, cell.row)) placed += 1;
    }
    return placed;
  }

  return {
    state,
    reset,
    startGame,
    placeTower,
    upgradeTower,
    sellTower,
    startWave,
    step,
    autoPlace,
    say,
    towerStats,
  };
}
