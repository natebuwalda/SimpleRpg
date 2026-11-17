import Phaser from 'phaser';
import { GameScene } from './view/GameScene';
import { mountUi } from './view/ui';
import './style.css';

const ui = mountUi(document.querySelector<HTMLElement>('#app')!);
ui.render({ kind: 'title' }, 'No saved adventure yet.');
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'canvas',
  width: 160,
  height: 160,
  pixelArt: true,
  backgroundColor: '#223f35',
  banner: false,
  scene: [GameScene],
  audio: { noAudio: true },
});
