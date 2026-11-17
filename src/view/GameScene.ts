import Phaser from 'phaser';
import type { GameState } from '../game/types';

export class GameScene extends Phaser.Scene {
  private drawing?: Phaser.GameObjects.Graphics;
  constructor() { super('world'); }
  create() {
    this.drawing = this.add.graphics();
    this.renderState({ kind: 'title' });
  }
  renderState(_state: GameState): void {
    const g = this.drawing;
    if (!g) return;
    g.clear();
    g.fillStyle(0x223f35).fillRect(0, 0, 160, 160);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      g.fillStyle((x + y) % 2 ? 0x294b3b : 0x2d503e).fillRect(x * 16, y * 16, 16, 16);
      g.fillStyle(0x41634a).fillRect(x * 16 + 4, y * 16 + 5, 2, 1);
      if (x === 0 || x === 9 || y === 0 || y === 9) {
        g.fillStyle(0x142f2d).fillRect(x * 16 + 1, y * 16 + 3, 14, 12);
        g.fillStyle(0x3e6248).fillRect(x * 16 + 3, y * 16 + 1, 10, 8);
      }
    }
    g.fillStyle(0xc4b18a).fillRect(32, 32, 96, 16).fillRect(80, 48, 16, 80);
    g.fillStyle(0x192c2b).fillEllipse(42, 46, 12, 4);
    g.fillStyle(0xe4c69a).fillRect(38, 34, 8, 6);
    g.fillStyle(0x79b8bf).fillRect(37, 40, 10, 6);
    g.fillStyle(0x253c4a).fillRect(39, 46, 3, 3).fillRect(44, 46, 3, 3);
    g.fillStyle(0x9dc67c).fillRoundedRect(98, 68, 13, 9, 4);
    g.fillStyle(0x203b32).fillRect(101, 71, 2, 2).fillRect(106, 71, 2, 2);
  }
}
