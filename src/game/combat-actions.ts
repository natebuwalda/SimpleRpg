import type { CharacterRatings } from './character';

export type OffensiveAction = 'melee' | 'magic';
export type CombatCommand = OffensiveAction | 'run';
export type ClassId = 'warrior' | 'wizard';

export const CLASS_DEFINITIONS = {
  warrior: { label: 'Warrior', offense: 'melee' },
  wizard: { label: 'Wizard', offense: 'magic' },
} as const satisfies Record<ClassId, { label: string; offense: OffensiveAction }>;

export const OFFENSIVE_ACTIONS = {
  melee: { label: 'Melee', skill: 'combat' },
  magic: { label: 'Magic', skill: 'lore' },
} as const satisfies Record<OffensiveAction, { label: string; skill: keyof CharacterRatings['skills'] }>;

export function isClassId(value: unknown): value is ClassId {
  return value === 'warrior' || value === 'wizard';
}

export function isCombatCommand(value: string): value is CombatCommand {
  return value === 'melee' || value === 'magic' || value === 'run';
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
