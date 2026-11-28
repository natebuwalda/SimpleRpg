import type { CharacterRatings } from './character';
import { MAX_COMBAT_POOL } from './dice';

export type OffensiveAction = 'melee' | 'magic';
export type ClassAction = 'momentum' | 'nuke' | 'exploit' | 'heal' | 'smite';
export type CombatCommand = OffensiveAction | ClassAction | 'run';
export type ClassId = 'warrior' | 'wizard' | 'rogue' | 'cleric';

export const CLASS_DEFINITIONS = {
  warrior: { label: 'Warrior', offense: 'melee', classActions: ['momentum'] },
  wizard: { label: 'Wizard', offense: 'magic', classActions: ['nuke'] },
  rogue: { label: 'Rogue', offense: 'melee', classActions: ['exploit'] },
  cleric: { label: 'Cleric', offense: 'melee', classActions: ['heal', 'smite'] },
} as const satisfies Record<ClassId, { label: string; offense: OffensiveAction; classActions: readonly ClassAction[] }>;

export const CLASS_ACTION_DEFINITIONS = {
  momentum: { label: 'Momentum', description: 'Each stack adds one Melee die and one Defense die for the encounter.' },
  nuke: { label: 'Nuke', description: 'Deal Cunning + Lore damage directly on your turn.' },
  exploit: { label: 'Exploit', description: 'Act first to build stacks with Cunning + Subterfuge.' },
  heal: { label: 'Heal', description: 'Restore Health up to current Resources, then spend one Resource.' },
  smite: { label: 'Smite', description: 'Deal direct damage up to missing Resources, then gain one Resource.' },
} as const satisfies Record<ClassAction, { label: string; description: string }>;

export const OFFENSIVE_ACTIONS = {
  melee: { label: 'Melee', skill: 'combat' },
  magic: { label: 'Magic', skill: 'lore' },
} as const satisfies Record<OffensiveAction, { label: string; skill: keyof CharacterRatings['skills'] }>;

export function isClassId(value: unknown): value is ClassId {
  return typeof value === 'string' && Object.hasOwn(CLASS_DEFINITIONS, value);
}

export function isCombatCommand(value: string): value is CombatCommand {
  return value === 'run' || Object.hasOwn(OFFENSIVE_ACTIONS, value) || Object.hasOwn(CLASS_ACTION_DEFINITIONS, value);
}

export function offenseFor(classId: ClassId): OffensiveAction {
  return CLASS_DEFINITIONS[classId].offense;
}

export function getCombatPools({ attributes, skills }: CharacterRatings, action: OffensiveAction) {
  return {
    attack: attributes.prowess + skills[OFFENSIVE_ACTIONS[action].skill],
    defense: attributes.resistance + skills.combat,
  };
}

export function getExploitPool({ attributes, skills }: CharacterRatings): number {
  return Math.min(attributes.cunning + skills.subterfuge, MAX_COMBAT_POOL);
}

export function getNukeDamage({ attributes, skills }: CharacterRatings): number {
  return attributes.cunning + skills.lore;
}

export function getClericPool({ attributes, skills }: CharacterRatings): number {
  return Math.min(attributes.resistance + skills.lore, MAX_COMBAT_POOL);
}

export function startingResources(maxResources: number): number {
  return Math.ceil(maxResources / 2);
}
