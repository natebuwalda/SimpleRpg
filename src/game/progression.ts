import { getMeleePools, type Character, type CharacterRatings } from './character';

const attributeKeys = ['prowess', 'cunning', 'resistance'] as const;
const skillKeys = ['combat', 'subterfuge', 'lore'] as const;
export type Rating =
  | { group: 'attributes'; key: typeof attributeKeys[number] }
  | { group: 'skills'; key: typeof skillKeys[number] };
export type Progression = { level: number; xp: number; investments: CharacterRatings };

export const SLIME_XP = 1;
// Combat retains individual die faces for the roll log.
export const MAX_MELEE_POOL = 1024;
export function xpToNextLevel(_level: number): number { return 5; }

export function createProgression(): Progression {
  return { level: 1, xp: 0, investments: {
    attributes: { prowess: 0, cunning: 0, resistance: 0 },
    skills: { combat: 0, subterfuge: 0, lore: 0 },
  } };
}

export function awardXp(progress: Progression, amount: number, cost = xpToNextLevel): Progression {
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(progress.xp + amount)) return progress;
  let { level, xp } = progress;
  xp += amount;
  while (true) {
    const threshold = cost(level);
    if (!Number.isSafeInteger(threshold) || threshold <= 0) return progress;
    if (xp < threshold) return { ...progress, level, xp };
    if (level >= Number.MAX_SAFE_INTEGER - 10) return progress;
    xp -= threshold;
    level++;
  }
}

export function availablePoints(progress: Progression): number {
  const { attributes, skills } = progress.investments;
  return progress.level - 1 - [...Object.values(attributes), ...Object.values(skills)].reduce((sum, rating) => sum + rating, 0);
}

export function progressionSummary(progress: Progression, cost = xpToNextLevel): string {
  const points = availablePoints(progress);
  return `Level ${progress.level} · ${progress.xp} / ${cost(progress.level)} XP · ${points} ${points === 1 ? 'point' : 'points'} available`;
}

export function effectiveCharacter(base: Character, { investments }: Progression): Character {
  const { attributes, skills } = base;
  return {
    name: base.name,
    attributes: {
      prowess: attributes.prowess + investments.attributes.prowess,
      cunning: attributes.cunning + investments.attributes.cunning,
      resistance: attributes.resistance + investments.attributes.resistance,
    },
    skills: {
      combat: skills.combat + investments.skills.combat,
      subterfuge: skills.subterfuge + investments.skills.subterfuge,
      lore: skills.lore + investments.skills.lore,
    },
  };
}

export function hasSupportedMeleePools(character: Character): boolean {
  const {attack, defense} = getMeleePools(character);
  return attack <= MAX_MELEE_POOL && defense <= MAX_MELEE_POOL;
}

export function spendPoint(progress: Progression, rating: Rating): Progression {
  if (availablePoints(progress) <= 0) return progress;
  const { attributes, skills } = progress.investments;
  if (rating.group === 'attributes' && attributeKeys.includes(rating.key)) {
    return { ...progress, investments: { ...progress.investments, attributes: { ...attributes, [rating.key]: attributes[rating.key] + 1 } } };
  }
  if (rating.group === 'skills' && skillKeys.includes(rating.key)) {
    return { ...progress, investments: { ...progress.investments, skills: { ...skills, [rating.key]: skills[rating.key] + 1 } } };
  }
  return progress;
}

export function parseProgression(value: unknown): Progression | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<Progression>;
  const { level, xp, investments } = input;
  if (typeof level !== 'number' || !Number.isSafeInteger(level) || level < 1 || level > Number.MAX_SAFE_INTEGER - 10
    || typeof xp !== 'number' || !Number.isSafeInteger(xp) || xp < 0 || xp >= xpToNextLevel(level)) return null;
  const result = createProgression();
  let remaining = level - 1;
  function copy<K extends string>(keys: readonly K[], source: Partial<Record<K, number>> | undefined, target: Record<K, number>) {
    if (!source) return false;
    for (const key of keys) {
      const rating = source[key];
      if (typeof rating !== 'number' || !Number.isSafeInteger(rating) || rating < 0 || rating > remaining) return false;
      target[key] = rating;
      remaining -= rating;
    }
    return true;
  }
  if (!copy(attributeKeys, investments?.attributes, result.investments.attributes)
    || !copy(skillKeys, investments?.skills, result.investments.skills)) return null;
  return { ...result, level, xp };
}
