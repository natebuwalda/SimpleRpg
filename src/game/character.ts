import { isClassId, type ClassId } from './combat-actions';

export type CharacterRatings = {
  attributes: { prowess: number; cunning: number; resistance: number };
  skills: { combat: number; subterfuge: number; lore: number };
};
export type Character = CharacterRatings & { name: string; classId: ClassId };

export function createStarterCharacter(): Character {
  return { name: 'Adventurer', classId: 'warrior', attributes: { prowess: 3, cunning: 3, resistance: 2 }, skills: { combat: 2, subterfuge: 2, lore: 1 } };
}
export function deriveStats({ attributes: a }: CharacterRatings) {
  return { maxHp: a.prowess + a.resistance, initiative: a.prowess + a.cunning, resourceCapacity: a.cunning + a.resistance };
}
export function isStarterCharacter(value: unknown): value is CharacterRatings {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Character>;
  return !!v.attributes && !!v.skills
    && v.attributes.prowess === 3 && v.attributes.cunning === 3 && v.attributes.resistance === 2
    && v.skills.combat === 2 && v.skills.subterfuge === 2 && v.skills.lore === 1;
}

export function isValidCharacter(value: unknown): value is Character {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Character>;
  if (typeof v.name !== 'string' || !v.name.length || v.name.length > 24 || v.name !== v.name.trim()) return false;
  if (!isClassId(v.classId)) return false;
  const validGroup = (group: unknown, keys: string[], base: number, total: number) => {
    if (!group || typeof group !== 'object' || Array.isArray(group)) return false;
    const values = keys.map(key => (group as Record<string, unknown>)[key]);
    return values.every(n => typeof n === 'number' && Number.isInteger(n) && n >= base && n <= 5)
      && (values as number[]).reduce((sum,n) => sum+n,0) === total;
  };
  return validGroup(v.attributes,['prowess','cunning','resistance'],1,8)
    && validGroup(v.skills,['combat','subterfuge','lore'],0,5);
}
