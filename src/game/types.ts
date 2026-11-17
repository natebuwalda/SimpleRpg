export type Position = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';
export const SLIME_IDS = ['slime-1', 'slime-2', 'slime-3'] as const;
export type SlimeId = typeof SLIME_IDS[number];
export type SlimePlacement = { id: SlimeId; position: Position };
export type WorldGeometry = { layout: 'woodland' | 'legacy-expanded'; width: number; height: number };
export type WorldDefinition = WorldGeometry & { version: 2; slimes: SlimePlacement[] };
export type Checkpoint = { version: 3; world: WorldDefinition; position: Position; hp: number; completedEncounterIds: SlimeId[] };
export type BattleState = { heroHp: number; enemyHp: number; result: 'active' | 'victory' | 'defeat' | 'escaped' };
export type GameState =
  | { kind: 'title' }
  | { kind: 'exploring'; checkpoint: Checkpoint }
  | { kind: 'battle'; checkpoint: Checkpoint; returnPosition: Position; battle: BattleState; encounterId: SlimeId }
  | { kind: 'victory'; checkpoint: Checkpoint }
  | { kind: 'defeat'; checkpoint: Checkpoint };
export type Action =
  | { type: 'newGame'; world: WorldDefinition }
  | { type: 'attack' | 'run' | 'acknowledgeVictory' | 'restart' }
  | { type: 'continue'; checkpoint: Checkpoint }
  | { type: 'move'; direction: Direction };

export type UiAction = Exclude<Action, { type: 'newGame' }> | { type: 'newGame' };
