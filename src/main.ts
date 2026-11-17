import Phaser from 'phaser';
import { GameScene } from './view/GameScene';
import { mountUi } from './view/ui';
import type { UiAction, Direction } from './game/types';
import { createSession, transition } from './game/session';
import { loadSave, saveGame } from './game/save';
import { VIEWPORT_TILES, TILE_SIZE } from './game/viewport';
import { generateWorld } from './game/world';
import './style.css';

const ui = mountUi(document.querySelector<HTMLElement>('#app')!);
let state = createSession();
const scene = new GameScene();
let storage: Storage | null = null;
try { storage = window.localStorage; } catch { /* Play without persistent storage. */ }
function readSave() {
  const result = storage ? loadSave(storage) : { checkpoint: null, status: 'unavailable' as const, migrated: false };
  if (result.migrated && result.checkpoint && storage && !saveGame(storage, result.checkpoint)) return { ...result, status: 'unavailable' as const };
  return result;
}
const loaded = readSave();
let saved = loaded.checkpoint;
let saveStatus = {
  ready: 'Your adventure is ready to continue.',
  empty: 'No saved adventure yet.',
  invalid: 'Your saved adventure could not be read. Start a new game.',
  unavailable: 'Progress cannot be saved in this browser. You can still play.',
}[loaded.status];
ui.setSaved(saved);
function refreshTitleSave() {
  if (state.kind !== 'title') return;
  const current = readSave();
  saved = current.checkpoint;
  saveStatus = {
    ready: 'Your adventure is ready to continue.',
    empty: 'No saved adventure yet.',
    invalid: 'Your saved adventure could not be read. Start a new game.',
    unavailable: 'Progress cannot be saved in this browser. You can still play.',
  }[current.status];
  ui.setSaved(saved);
  ui.render(state, saveStatus);
}
ui.onTitleAction(refreshTitleSave);
window.addEventListener('storage', refreshTitleSave);
window.addEventListener('focus', refreshTitleSave);
let active = true;
let busy = false;
function dispatch(action: UiAction) {
  if (!active || (busy && (action.type === 'attack' || action.type === 'run'))) return;
  const resolving = state.kind === 'battle' && (action.type === 'attack' || action.type === 'run');
  if (resolving) busy = true;
  if (action.type === 'newGame' || action.type === 'continue' || action.type === 'restart') scene.resetViewport();
  const previous = state;
  state = transition(state, action.type === 'newGame' ? { type: 'newGame', world: generateWorld() } : action);
  if (state !== previous && (state.kind === 'exploring' || state.kind === 'victory') && action.type !== 'continue' && action.type !== 'acknowledgeVictory') {
    if (storage && saveGame(storage, state.checkpoint)) {
      saved = state.checkpoint;
      saveStatus = 'Adventure saved on this device.';
    } else saveStatus = 'Progress cannot be saved in this browser. You can still play.';
    ui.setSaved(saved);
  }
  ui.render(state, saveStatus);
  scene.renderState(state);
  ui.setBusy(busy);
  if (resolving) {
    ui.setBusy(true);
    window.setTimeout(() => { busy = false; ui.setBusy(false); }, 300);
  }
}
ui.onAction(dispatch);
ui.render(state, saveStatus);
window.addEventListener('blur', () => { active = false; });
window.addEventListener('focus', () => { active = true; });
document.addEventListener('visibilitychange', () => { active = !document.hidden; });
const directions: Record<string, Direction> = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
window.addEventListener('keydown', event => {
  if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  const direction = directions[event.key];
  if (direction) {
    event.preventDefault();
    if (!event.repeat) dispatch({ type: 'move', direction });
  }
});
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'canvas',
  width: VIEWPORT_TILES * TILE_SIZE,
  height: VIEWPORT_TILES * TILE_SIZE,
  pixelArt: true,
  backgroundColor: '#223f35',
  banner: false,
  scene: [scene],
  audio: { noAudio: true },
});
