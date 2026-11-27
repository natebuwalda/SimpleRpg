import type { CharacterRatings } from './character';
import { MAX_COMBAT_POOL } from './dice';

export type OffensiveAction = 'melee' | 'magic';
export type ClassAction = 'momentum' | 'nuke' | 'exploit';
export type CombatCommand = OffensiveAction | ClassAction | 'run';
export type ClassId = 'warrior' | 'wizard' | 'rogue';

export const CLASS_DEFINITIONS = {
  warrior: { label: 'Warrior', offense: 'melee', classAction: 'momentum' },
  wizard: { label: 'Wizard', offense: 'magic', classAction: 'nuke' },
  rogue: { label: 'Rogue', offense: 'melee', classAction: 'exploit' },
} as const satisfies Record<ClassId, { label: string; offense: OffensiveAction; classAction: ClassAction }>;

export const CLASS_ACTION_DEFINITIONS = {
  momentum: { label: 'Momentum', description: 'Each stack adds one Melee die and one Defense die for the encounter.' },
  nuke: { label: 'Nuke', description: 'Deal Cunning + Lore damage directly on your turn.' },
  exploit: { label: 'Exploit', description: 'Act first to build stacks with Cunning + Subterfuge.' },
} as const satisfies Record<ClassAction, { label: string; description: string }>;

export const OFFENSIVE_ACTIONS = {
  melee: { label: 'Melee', skill: 'combat' },
  magic: { label: 'Magic', skill: 'lore' },
} as const satisfies Record<OffensiveAction, { label: string; skill: keyof CharacterRatings['skills'] }>;

export function isClassId(value: unknown): value is ClassId {
  return value === 'warrior' || value === 'wizard' || value === 'rogue';
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
