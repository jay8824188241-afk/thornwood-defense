// Thornwood Defense: every number that tunes the game lives here, so the
// balance can be read and changed in one place. Nothing here imports
// anything: the other modules read these tables and build the game from them.

// The field is a 24 by 15 grid of 40-pixel cells: 960 by 600 in all.
export const CELL = 40;
export const COLS = 24;
export const ROWS = 15;
export const FIELD_WIDTH = COLS * CELL;
export const FIELD_HEIGHT = ROWS * CELL;

// The blight's road, as grid waypoints from off the left edge to the
// Heartwood on the right. Enemies walk it in order.
export const PATH = [
  [-1, 2], [18, 2], [18, 5], [4, 5], [4, 8], [19, 8], [19, 11], [7, 11], [7, 13], [21, 13],
];
export const HEARTWOOD = { col: 22, row: 13 };

// A few cells the forest itself blocks: rocks and a pond, so the field is
// not one flat lawn and placement has to work around them.
export const BLOCKED = [
  { col: 10, row: 3, kind: 'rock' },
  { col: 11, row: 3, kind: 'rock' },
  { col: 13, row: 9, kind: 'pond' },
  { col: 14, row: 9, kind: 'pond' },
  { col: 14, row: 10, kind: 'pond' },
  { col: 2, row: 6, kind: 'rock' },
  { col: 21, row: 4, kind: 'rock' },
  { col: 15, row: 12, kind: 'rock' },
];

export const START_GOLD = 260;
export const START_LIVES = 20;
export const WAVE_COUNT = 12;
export const WAVE_CLEAR_BONUS = 25;
export const SELL_RATE = 0.7;
export const BRUTE_LEAK_COST = 5;

// Towers: five kinds, each with one clear job. cost is the build price;
// upgradeCost is per level (a tower has levels 1 to 3); damage and range
// grow by upgradeDamage and upgradeRange each level. range is in pixels,
// rate is shots per second, projectileSpeed in pixels per second.
export const TOWERS = {
  thorn: {
    name: 'Thorn Spitter',
    key: '1',
    cost: 60,
    upgradeCost: 50,
    damage: 9,
    upgradeDamage: 8,
    range: 120,
    upgradeRange: 12,
    rate: 2.2,
    projectileSpeed: 320,
    color: '#7dd069',
    dark: '#3f7d33',
    blurb: 'Fast thorns. Cheap, quick, honest.',
  },
  frost: {
    name: 'Frost Shard',
    key: '2',
    cost: 90,
    upgradeCost: 70,
    damage: 5,
    upgradeDamage: 4,
    range: 110,
    upgradeRange: 10,
    rate: 1.4,
    projectileSpeed: 280,
    slow: 0.5,
    slowSeconds: 1.6,
    color: '#8fd8ff',
    dark: '#3f7fb8',
    blurb: 'Chills the blight to half speed.',
  },
  ember: {
    name: 'Ember Cannon',
    key: '3',
    cost: 140,
    upgradeCost: 110,
    damage: 26,
    upgradeDamage: 22,
    range: 150,
    upgradeRange: 12,
    rate: 0.6,
    projectileSpeed: 220,
    splash: 55,
    color: '#ff9a3d',
    dark: '#b85c14',
    blurb: 'Slow lobbed embers that burst.',
  },
  storm: {
    name: 'Storm Coil',
    key: '4',
    cost: 180,
    upgradeCost: 140,
    damage: 16,
    upgradeDamage: 14,
    range: 140,
    upgradeRange: 12,
    rate: 0.9,
    chain: 3,
    color: '#e3b8ff',
    dark: '#8a5fc0',
    blurb: 'Lightning that jumps between foes.',
  },
  vine: {
    name: 'Vine Snare',
    key: '5',
    cost: 50,
    upgradeCost: 40,
    damage: 3,
    upgradeDamage: 3,
    range: 95,
    upgradeRange: 10,
    rate: 1.0,
    projectileSpeed: 240,
    slow: 0.35,
    slowSeconds: 2.2,
    color: '#d8c26a',
    dark: '#8a7a2e',
    blurb: 'Vines that hold the blight still.',
  },
};

export const TOWER_ORDER = ['thorn', 'frost', 'ember', 'storm', 'vine'];

// Enemies: kind, health, speed in pixels per second, bounty in gold,
// leak cost in lives, and a radius for drawing and hits. Health grows
// with the wave: hp * (1 + 0.22 * (wave - 1)).
export const ENEMIES = {
  mite: { name: 'Mite', hp: 30, speed: 70, bounty: 8, leak: 1, radius: 10, color: '#c94f5e', dark: '#7d2430' },
  beetle: { name: 'Beetle', hp: 110, speed: 38, bounty: 16, leak: 1, radius: 14, color: '#8a6fd6', dark: '#4d3585' },
  swift: { name: 'Swift', hp: 48, speed: 95, bounty: 12, leak: 1, radius: 9, color: '#e8a13c', dark: '#8a5a10' },
  wisp: { name: 'Wisp', hp: 40, speed: 115, bounty: 14, leak: 1, radius: 8, color: '#7fd8c9', dark: '#2e7d72' },
  brute: { name: 'Blight Brute', hp: 900, speed: 28, bounty: 120, leak: BRUTE_LEAK_COST, radius: 20, color: '#5e2b3d', dark: '#33111d' },
};

// The twelve waves. Each wave is a list of groups: kind, count, gap in
// seconds between spawns in that group. Later waves mix kinds and tighten
// the gaps. The last wave is the final stand: two brutes with escorts.
export const WAVES = [
  [{ kind: 'mite', count: 8, gap: 1.0 }],
  [{ kind: 'mite', count: 12, gap: 0.85 }],
  [{ kind: 'mite', count: 8, gap: 0.7 }, { kind: 'beetle', count: 4, gap: 1.2 }],
  [{ kind: 'beetle', count: 8, gap: 0.9 }, { kind: 'swift', count: 6, gap: 0.8 }],
  [{ kind: 'mite', count: 14, gap: 0.55 }, { kind: 'beetle', count: 6, gap: 0.8 }],
  [{ kind: 'wisp', count: 10, gap: 0.6 }, { kind: 'swift', count: 8, gap: 0.6 }],
  [{ kind: 'beetle', count: 12, gap: 0.65 }, { kind: 'wisp', count: 8, gap: 0.5 }],
  [{ kind: 'swift', count: 14, gap: 0.45 }, { kind: 'beetle', count: 8, gap: 0.6 }],
  [{ kind: 'wisp', count: 16, gap: 0.4 }, { kind: 'mite', count: 10, gap: 0.4 }],
  [{ kind: 'brute', count: 1, gap: 1.0 }, { kind: 'swift', count: 10, gap: 0.5 }, { kind: 'beetle', count: 6, gap: 0.7 }],
  [{ kind: 'beetle', count: 14, gap: 0.5 }, { kind: 'wisp', count: 14, gap: 0.4 }, { kind: 'swift', count: 10, gap: 0.4 }],
  [{ kind: 'brute', count: 2, gap: 6.0 }, { kind: 'wisp', count: 12, gap: 0.4 }, { kind: 'beetle', count: 10, gap: 0.5 }, { kind: 'swift', count: 10, gap: 0.4 }],
];

// The look: one coherent palette for the whole game.
export const PALETTE = {
  grassLight: '#3e6b34',
  grassDark: '#355c2d',
  path: '#8a6f4d',
  pathEdge: '#6d5638',
  heartwood: '#4caf6d',
  heartwoodDark: '#2e7d46',
  panel: 'rgba(12, 20, 12, 0.88)',
  panelEdge: '#5a7d4f',
  text: '#eef6e6',
  textDim: '#a8c49a',
  gold: '#ffd76a',
  red: '#ff6b6b',
};
