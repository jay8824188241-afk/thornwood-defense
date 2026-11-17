// Thornwood Defense, the controls: mouse and keyboard, mapped onto the
// world. Clicks land on toolbar buttons, the field, or the selected
// tower's panel; keys pick towers, send waves and pause. Nothing here
// draws or simulates: it only turns gestures into calls on the world.

import { CELL, COLS, ROWS, TOWER_ORDER, TOWERS } from './config.js';
import { HUD_HEIGHT, TOOLBAR_HEIGHT, CANVAS_HEIGHT, toolbarButtons, selectedPanelButtons } from './render.js';
import { isBuildable } from './world.js';

/** The canvas cell under a canvas point, or null when the point is not on the field. */
function cellAt(x, y) {
  const fieldY = y - HUD_HEIGHT;
  if (x < 0 || x >= COLS * CELL || fieldY < 0 || fieldY >= ROWS * CELL) return null;
  return { col: Math.floor(x / CELL), row: Math.floor(fieldY / CELL) };
}

function inside(point, region) {
  return point.x >= region.x && point.x < region.x + region.width
    && point.y >= region.y && point.y < region.y + region.height;
}

/**
 * Wire the canvas and the keyboard to the world. `hooks` is what the
 * game loop owns: startGame, restart, togglePause, toggleSpeed,
 * toggleMute, and the sound board for error feedback.
 */
export function createInput(canvas, world, hooks) {
  const state = world.state;

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function clickField(cell) {
    if (state.phase !== 'playing') return;
    if (state.selectedKind) {
      const placed = world.placeTower(state.selectedKind, cell.col, cell.row);
      if (placed) state.selectedKind = null;
      return;
    }
    const tower = state.towers.find((t) => t.col === cell.col && t.row === cell.row);
    state.selectedTower = tower || null;
  }

  function clickToolbar(point) {
    for (const button of toolbarButtons(state)) {
      if (!inside(point, button)) continue;
      if (button.id === 'wave') {
        if (!state.waveActive) world.startWave();
        return true;
      }
      if (button.id === 'speed') {
        state.speed = state.speed === 2 ? 1 : 2;
        return true;
      }
      state.selectedKind = state.selectedKind === button.id ? null : button.id;
      state.selectedTower = null;
      return true;
    }
    return false;
  }

  function clickPanel(point) {
    for (const button of selectedPanelButtons(state)) {
      if (!inside(point, button)) continue;
      if (!state.selectedTower) return true;
      if (button.id === 'upgrade') world.upgradeTower(state.selectedTower);
      if (button.id === 'sell') world.sellTower(state.selectedTower);
      return true;
    }
    return false;
  }

  function onPointerDown(event) {
    const point = canvasPoint(event);
    if (state.phase === 'title') { hooks.startGame(); return; }
    if (state.phase === 'victory' || state.phase === 'defeat') { hooks.restart(); return; }
    if (point.y >= CANVAS_HEIGHT - TOOLBAR_HEIGHT) {
      if (clickToolbar(point)) return;
    }
    if (clickPanel(point)) return;
    const cell = cellAt(point.x, point.y);
    if (cell) clickField(cell);
  }

  function onPointerMove(event) {
    const point = canvasPoint(event);
    const cell = cellAt(point.x, point.y);
    state.hover = cell && state.selectedKind ? cell : null;
    if (state.hover && state.selectedKind) {
      state.hover.buildable = isBuildable(state, cell.col, cell.row) && state.gold >= TOWERS[state.selectedKind].cost;
    }
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (state.phase === 'title' && (key === 'enter' || key === ' ')) { hooks.startGame(); return; }
    if ((state.phase === 'victory' || state.phase === 'defeat') && (key === 'r' || key === 'enter' || key === ' ')) { hooks.restart(); return; }
    if (state.phase !== 'playing') return;
    if (key === ' ') { event.preventDefault(); world.startWave(); return; }
    if (key === 'f') { state.speed = state.speed === 2 ? 1 : 2; return; }
    if (key === 'm') { hooks.toggleMute(); return; }
    if (key === 'p' || key === 'escape') { hooks.togglePause(); return; }
    if (key === 'u' && state.selectedTower) { world.upgradeTower(state.selectedTower); return; }
    if (key === 'x' && state.selectedTower) { world.sellTower(state.selectedTower); return; }
    const index = TOWER_ORDER.findIndex((kind) => TOWERS[kind].key === key);
    if (index !== -1) {
      const kind = TOWER_ORDER[index];
      state.selectedKind = state.selectedKind === kind ? null : kind;
      state.selectedTower = null;
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('keydown', onKeyDown);

  return { cellAt };
}
