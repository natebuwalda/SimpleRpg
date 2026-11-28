import type { CombatCommand, OffensiveAction } from './combat-actions';
import type { Character } from './character';
import type { OpposedRoll, PoolRoll } from './dice';
import type { Progression, Rating } from './progression';
import type { LegacyRosterVersion } from './roster';
export type { Character } from './character';
export type Position = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';
export const SLIME_IDS = ['slime-1', 'slime-2', 'slime-3'] as const;
export type SlimeId = typeof SLIME_IDS[number];
export type SlimePlacement = { id: SlimeId; position: Position };
export type WorldGeometry = { layout: 'woodland' | 'legacy-expanded'; width: number; height: number };
export type WorldDefinition = WorldGeometry & { version: 2; slimes: SlimePlacement[] };
export type Checkpoint = { version: 12; character: Character; world: WorldDefinition; position: Position; hp: number; currentResources?: number; completedEncounterIds: SlimeId[]; progression: Progression; initialSlimes: SlimePlacement[]; slimeLevel: number };
export type Combatant = 'hero' | 'slime';
export type InitiativeResult = { combatant: Combatant; rawInitiative: number; successes: number };
export type TurnOrder = readonly [InitiativeResult, InitiativeResult];
type ResourceActionRoll = { roll: PoolRoll; amount: number; currentResources: number };
export type TurnRolls = readonly (
  | { kind: 'attack'; attacker: Combatant; roll: OpposedRoll; resourceGain?: number; stacksAdded?: number; absorbed?: number }
  | { kind: 'exploit'; damage: number; stacks: bigint; resourceGain: number; currentResources: number }
  | { kind: 'momentum'; stacks: bigint; cost: number; currentResources: number }
  | { kind: 'nuke'; baseDamage: number; defense: PoolRoll; damage: number; currentResources: number }
  | { kind: 'execute' }
  | { kind: 'prepare'; successes: number; currentResources: number }
  | { kind: 'study'; reservedResources: number; released: number; currentResources: number }
  | ({ kind: 'heal' } & ResourceActionRoll)
  | ({ kind: 'smite' } & ResourceActionRoll)
)[];
export type BattleClassAction = { currentResources: number; maxResources: number } & (
  | { kind: 'momentum'; stacks: bigint }
  | { kind: 'nuke'; damage: number; reservedResources: number }
  | { kind: 'exploit'; stacks: bigint }
  | { kind: 'cleric'; pool: number; maxHp: number }
);
export type BattleState = { offense: OffensiveAction; heroHp: number; enemyHp: number; slimeLevel: number; heroPools: { attack: number; defense: number }; turnOrder: TurnOrder; classAction: BattleClassAction; lastTurn: TurnRolls | null; result: 'active' | 'victory' | 'defeat' | 'escaped' };
export type GameState =
  | { kind: 'title' }
  | { kind: 'exploring'; checkpoint: Checkpoint }
  | { kind: 'battle'; checkpoint: Checkpoint; returnPosition: Position; battle: BattleState; encounterId: SlimeId }
  | { kind: 'victory'; checkpoint: Checkpoint; lastTurn?: TurnRolls | null; levelGained?: boolean; xpAwarded: number }
  | { kind: 'defeat'; checkpoint: Checkpoint; lastTurn?: TurnRolls | null };
export type Action =
  | { type: 'newGame'; world: WorldDefinition; character: Character }
  | { type: Exclude<CombatCommand, 'study'> }
  | { type: 'study'; amount?: number }
  | { type: 'acknowledgeVictory' | 'restart' | 'returnToRoster' }
  | { type: 'resumeDefeat'; checkpoint: Checkpoint }
  | { type: 'continue'; checkpoint: Checkpoint }
  | { type: 'move'; direction: Direction };

export type UiAction = Exclude<Action, { type: 'newGame' }> | { type: 'newGame'; character: Character }
 |{type:'resumeSlot';id:string}|{type:'restartSlot'|'deleteSlot';id:string;revision:number}
 |{type:'resetRoster';raw:string;legacy?:LegacyRosterVersion}|{type:'discardProgress'|'retrySave'|'upgradeRoster'}
 |{type:'findMoreSlimes'}|{type:'spendPoint';rating:Rating};
