import Phaser from 'phaser';
import type { GameState, Position, WorldDefinition } from '../game/types';
import { isWalkable, getLandmarks } from '../game/world';
import { VIEWPORT_TILES, TILE_SIZE, updateViewport, worldToScreen } from '../game/viewport';
const PREVIEW_WORLD: WorldDefinition = {version:2,layout:'woodland',width:20,height:20,slimes:[
  {id:'slime-1',position:{x:5,y:3}}, {id:'slime-2',position:{x:8,y:8}}, {id:'slime-3',position:{x:15,y:15}},
]};

export class GameScene extends Phaser.Scene {
  private drawing?: Phaser.GameObjects.Graphics;
  private current: GameState = { kind: 'title' };
  private viewport: Position = {x:0,y:0};
  resetViewport(): void { this.viewport = {x:0,y:0}; }
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
      document.querySelector('#canvas')?.setAttribute('aria-description', 'Battle scene.');
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
    const world = state.kind === 'title' ? PREVIEW_WORLD : state.checkpoint.world;
    const {spawn, encounter} = getLandmarks(world);
    const hero = state.kind === 'title' ? spawn : state.checkpoint.position;
    this.viewport = updateViewport(world, hero, this.viewport);
    const view = this.viewport;
    const inView = (p: Position) => p.x >= 0 && p.y >= 0 && p.x < VIEWPORT_TILES && p.y < VIEWPORT_TILES;
    for (let y = 0; y < VIEWPORT_TILES; y++) for (let x = 0; x < VIEWPORT_TILES; x++) {
      const wx = x + view.x, wy = y + view.y;
      const px = x * TILE_SIZE, py = y * TILE_SIZE;
      g.fillStyle((wx + wy) % 2 ? 0x294b3b : 0x2d503e).fillRect(px, py, TILE_SIZE, TILE_SIZE);
      g.fillStyle(0x41634a).fillRect(px + 4, py + 5, 2, 1);
      if (!isWalkable(world, {x:wx,y:wy})) {
        g.fillStyle(0x142f2d).fillRect(px + 1, py + 3, 14, 12);
        g.fillStyle(0x3e6248).fillRect(px + 3, py + 1, 10, 8);
      } else if ((wy === spawn.y && wx >= spawn.x && wx <= encounter.x) || (wx === encounter.x && wy >= spawn.y && wy <= encounter.y)) {
        g.fillStyle(0xc4b18a).fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
    const p = worldToScreen(hero, view);
    if (inView(p)) {
      const px = p.x * TILE_SIZE, py = p.y * TILE_SIZE;
      g.fillStyle(0x192c2b).fillEllipse(px + 8, py + 14, 12, 4);
      g.fillStyle(0xe4c69a).fillRect(px + 5, py + 2, 7, 6);
      g.fillStyle(0x79b8bf).fillRect(px + 4, py + 8, 9, 5);
      g.fillStyle(0x253c4a).fillRect(px + 5, py + 13, 3, 3).fillRect(px + 10, py + 13, 3, 3);
    }
    for (const placement of world.slimes) {
      if (state.kind !== 'title' && state.checkpoint.completedEncounterIds.includes(placement.id)) continue;
      const slime = worldToScreen(placement.position, view);
      if (!inView(slime)) continue;
      const px = slime.x * TILE_SIZE, py = slime.y * TILE_SIZE;
      g.fillStyle(0x9dc67c).fillRoundedRect(px + 2, py + 4, 13, 9, 4);
      g.fillStyle(0x203b32).fillRect(px + 5, py + 7, 2, 2).fillRect(px + 10, py + 7, 2, 2);
    }
    document.querySelector('#canvas')?.setAttribute('aria-description', `World columns ${view.x}–${view.x + VIEWPORT_TILES - 1}, rows ${view.y}–${view.y + VIEWPORT_TILES - 1}.`);
  }
}
