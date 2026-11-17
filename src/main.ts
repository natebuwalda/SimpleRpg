import Phaser from 'phaser';
import { GameScene } from './view/GameScene';
import { mountUi } from './view/ui';
import type { Action, Direction } from './game/types';
import { createSession, transition } from './game/session';
import './style.css';

const ui = mountUi(document.querySelector<HTMLElement>('#app')!);
let state = createSession();
const scene = new GameScene();
let active = true;
let busy = false;
function dispatch(action: Action) {
  if (!active || (busy && (action.type === 'attack' || action.type === 'run'))) return;
  const resolving = state.kind === 'battle' && (action.type === 'attack' || action.type === 'run');
  if (resolving) busy = true;
  state = transition(state, action);
  ui.render(state, state.kind === 'title' ? 'No saved adventure yet.' : 'One step at a time.');
  scene.renderState(state);
  ui.setBusy(busy);
  if (resolving) {
    ui.setBusy(true);
    window.setTimeout(() => { busy = false; ui.setBusy(false); }, 300);
  }
}
ui.onAction(dispatch);
ui.render(state, 'No saved adventure yet.');
window.addEventListener('blur', () => { active = false; });
window.addEventListener('focus', () => { active = true; });
document.addEventListener('visibilitychange', () => { active = !document.hidden; });
const directions: Record<string, Direction> = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
window.addEventListener('keydown', event => {
  const direction = directions[event.key];
  if (direction) {
    event.preventDefault();
    if (!event.repeat) dispatch({ type: 'move', direction });
  }
});
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'canvas',
  width: 160,
  height: 160,
  pixelArt: true,
  backgroundColor: '#223f35',
  banner: false,
  scene: [scene],
  audio: { noAudio: true },
});
