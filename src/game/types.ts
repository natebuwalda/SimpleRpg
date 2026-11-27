import type { Character } from './character';
import type { OpposedRoll } from './dice';
import type { Progression, Rating } from './progression';
export type { Character } from './character';
export type Position = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';
export const SLIME_IDS = ['slime-1', 'slime-2', 'slime-3'] as const;
export type SlimeId = typeof SLIME_IDS[number];
export type SlimePlacement = { id: SlimeId; position: Position };
export type WorldGeometry = { layout: 'woodland' | 'legacy-expanded'; width: number; height: number };
export type WorldDefinition = WorldGeometry & { version: 2; slimes: SlimePlacement[] };
export type Checkpoint = { version: 6; character: Character; world: WorldDefinition; position: Position; hp: number; completedEncounterIds: SlimeId[]; progression: Progression; initialSlimes: SlimePlacement[] };
export type TurnRolls = { hero: OpposedRoll; slime: OpposedRoll | null };
export type BattleState = { heroHp: number; enemyHp: number; heroPools: { attack: number; defense: number }; lastTurn: TurnRolls | null; result: 'active' | 'victory' | 'defeat' | 'escaped' };
export type GameState =
  | { kind: 'title' }
  | { kind: 'exploring'; checkpoint: Checkpoint }
  | { kind: 'battle'; checkpoint: Checkpoint; returnPosition: Position; battle: BattleState; encounterId: SlimeId }
  | { kind: 'victory'; checkpoint: Checkpoint; lastTurn?: TurnRolls | null; levelGained?: boolean }
  | { kind: 'defeat'; checkpoint: Checkpoint; lastTurn?: TurnRolls | null };
export type Action =
  | { type: 'newGame'; world: WorldDefinition; character: Character }
  | { type: 'attack' | 'run' | 'acknowledgeVictory' | 'restart' | 'returnToRoster' }
  | { type: 'resumeDefeat'; checkpoint: Checkpoint }
  | { type: 'continue'; checkpoint: Checkpoint }
  | { type: 'move'; direction: Direction };

export type UiAction = Exclude<Action, { type: 'newGame' }> | { type: 'newGame'; character: Character }
 |{type:'resumeSlot';id:string}|{type:'restartSlot'|'deleteSlot';id:string;revision:number}
 |{type:'resetRoster';raw:string;legacy?:true}|{type:'discardProgress'|'retrySave'|'upgradeRoster'}
 |{type:'findMoreSlimes'}|{type:'spendPoint';rating:Rating};
