export type Position = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Checkpoint = { version: 1; position: Position; hp: number; completedEncounterIds: string[] };
export type BattleState = { heroHp: number; enemyHp: number; result: 'active' | 'victory' | 'defeat' | 'escaped' };
export type GameState =
  | { kind: 'title' }
  | { kind: 'exploring'; checkpoint: Checkpoint }
  | { kind: 'battle'; checkpoint: Checkpoint; returnPosition: Position; battle: BattleState }
  | { kind: 'victory'; checkpoint: Checkpoint }
  | { kind: 'defeat'; checkpoint: Checkpoint };
export type Action =
  | { type: 'newGame' | 'attack' | 'run' | 'acknowledgeVictory' | 'restart' }
  | { type: 'continue'; checkpoint: Checkpoint }
  | { type: 'move'; direction: Direction };
