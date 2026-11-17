import Phaser from 'phaser';
import type { GameState } from '../game/types';
import { ENCOUNTER_ID, isWalkable, getLandmarks } from '../game/world';

export class GameScene extends Phaser.Scene {
  private drawing?: Phaser.GameObjects.Graphics;
  private current: GameState = { kind: 'title' };
  constructor() { super('world'); }
  create() {
    this.drawing = this.add.graphics();
    this.renderState(this.current);
  }
  renderState(state: GameState): void {
    this.current = state;
    const g = this.drawing;
    if (!g) return;
    g.clear();
    if (state.kind === 'battle' || state.kind === 'defeat' || state.kind === 'victory') {
      g.fillStyle(0x213732).fillRect(0, 0, 160, 160);
      g.fillStyle(0x365344).fillRect(0, 100, 160, 60);
      g.lineStyle(1, 0x648268).lineBetween(0, 100, 160, 100);
      for (let i = 0; i < 8; i++) g.fillStyle(0x789371, .3).fillRect(i * 23, 112 + i % 3 * 10, 10, 1);
      g.fillStyle(0x152c29).fillEllipse(104, 105, 44, 10);
      if (state.kind !== 'victory') {
        g.fillStyle(0xa6c777).fillRoundedRect(84, 76, 40, 27, 9);
        g.fillStyle(0xc9dfa1).fillRect(91, 81, 9, 4);
        g.fillStyle(0x243f33).fillRect(95, 89, 3, 4).fillRect(111, 89, 3, 4);
      }
      g.fillStyle(0xe4c69a).fillRect(36, 77, 12, 12);
      g.fillStyle(0x79b8bf).fillRect(33, 89, 18, 16);
      g.fillStyle(0x152c29).fillRect(35, 105, 5, 7).fillRect(45, 105, 5, 7);
      g.fillStyle(0xd5dfaa).fillRect(54, 78, 2, 23);
      return;
    }
    g.fillStyle(0x223f35).fillRect(0, 0, 160, 160);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      g.fillStyle((x + y) % 2 ? 0x294b3b : 0x2d503e).fillRect(x * 16, y * 16, 16, 16);
      g.fillStyle(0x41634a).fillRect(x * 16 + 4, y * 16 + 5, 2, 1);
      if (!isWalkable(state.kind === 'title' ? {version:1,layout:'woodland',width:20,height:20} : state.checkpoint.world, { x, y })) {
        g.fillStyle(0x142f2d).fillRect(x * 16 + 1, y * 16 + 3, 14, 12);
        g.fillStyle(0x3e6248).fillRect(x * 16 + 3, y * 16 + 1, 10, 8);
      }
    }
    g.fillStyle(0xc4b18a).fillRect(16, 32, 128, 16).fillRect(96, 48, 16, 80);
    const p = state.kind === 'title' ? { x: 2, y: 2 } : state.checkpoint.position;
    const px = p.x * 16, py = p.y * 16;
    g.fillStyle(0x192c2b).fillEllipse(px + 8, py + 14, 12, 4);
    g.fillStyle(0xe4c69a).fillRect(px + 5, py + 2, 7, 6);
    g.fillStyle(0x79b8bf).fillRect(px + 4, py + 8, 9, 5);
    g.fillStyle(0x253c4a).fillRect(px + 5, py + 13, 3, 3).fillRect(px + 10, py + 13, 3, 3);
    if (state.kind === 'title' || !state.checkpoint.completedEncounterIds.includes(ENCOUNTER_ID)) {
      g.fillStyle(0x9dc67c).fillRoundedRect(98, 68, 13, 9, 4);
      g.fillStyle(0x203b32).fillRect(101, 71, 2, 2).fillRect(106, 71, 2, 2);
    }
  }
}
