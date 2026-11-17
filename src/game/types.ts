export type Position = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';
export type WorldDefinition = { version: 1; layout: 'woodland' | 'legacy-expanded'; width: number; height: number };
export type Checkpoint = { version: 2; world: WorldDefinition; position: Position; hp: number; completedEncounterIds: string[] };
export type BattleState = { heroHp: number; enemyHp: number; result: 'active' | 'victory' | 'defeat' | 'escaped' };
export type GameState =
  | { kind: 'title' }
  | { kind: 'exploring'; checkpoint: Checkpoint }
  | { kind: 'battle'; checkpoint: Checkpoint; returnPosition: Position; battle: BattleState }
  | { kind: 'victory'; checkpoint: Checkpoint }
  | { kind: 'defeat'; checkpoint: Checkpoint };
export type Action =
  | { type: 'newGame'; world: WorldDefinition }
  | { type: 'attack' | 'run' | 'acknowledgeVictory' | 'restart' }
  | { type: 'continue'; checkpoint: Checkpoint }
  | { type: 'move'; direction: Direction };

export type UiAction = Exclude<Action, { type: 'newGame' }> | { type: 'newGame' };
