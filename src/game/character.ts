export type Character = {
  attributes: { prowess: number; cunning: number; resistance: number };
  skills: { combat: number; subterfuge: number; lore: number };
};

export function createStarterCharacter(): Character {
  return { attributes: { prowess: 3, cunning: 3, resistance: 2 }, skills: { combat: 2, subterfuge: 2, lore: 1 } };
}
export function deriveStats({ attributes: a }: Character) {
  return { maxHp: a.prowess + a.resistance, initiative: a.prowess + a.cunning, resourceCapacity: a.cunning + a.resistance };
}
export function getMeleePools({ attributes: a, skills: s }: Character) {
  return { attack: a.prowess + s.combat, defense: a.resistance + s.combat };
}
export function isStarterCharacter(value: unknown): value is Character {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Character>;
  return !!v.attributes && !!v.skills
    && v.attributes.prowess === 3 && v.attributes.cunning === 3 && v.attributes.resistance === 2
    && v.skills.combat === 2 && v.skills.subterfuge === 2 && v.skills.lore === 1;
}
