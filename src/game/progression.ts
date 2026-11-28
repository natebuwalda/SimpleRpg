import type { Character, CharacterRatings } from './character';
import { getCombatPools, offenseFor } from './combat-actions';
import { MAX_COMBAT_POOL } from './dice';

const attributeKeys = ['prowess', 'cunning', 'resistance'] as const;
const skillKeys = ['combat', 'subterfuge', 'lore'] as const;
export type Rating =
  | { group: 'attributes'; key: typeof attributeKeys[number] }
  | { group: 'skills'; key: typeof skillKeys[number] };
export type XpCurve = 'flat-v1' | 'linear-v1';
export type Progression = { curve: XpCurve; level: number; xp: number; investments: CharacterRatings };

const MAX_PLAYER_LEVEL = Number.MAX_SAFE_INTEGER - 10;
const LEGACY_XP_PER_LEVEL = 5n;
const LINEAR_XP_MULTIPLIER = 5n;

function maxLevel(curve: XpCurve): number {
  // The saved XP remainder must fit in a safe integer even at the last level.
  return curve === 'flat-v1'
    ? MAX_PLAYER_LEVEL
    : Math.min(MAX_PLAYER_LEVEL, Number((BigInt(Number.MAX_SAFE_INTEGER) + 1n) / LINEAR_XP_MULTIPLIER));
}

export function xpForLevel(level: number, curve: XpCurve): bigint {
  const levelsGained = BigInt(level - 1);
  return curve === 'flat-v1'
    ? LEGACY_XP_PER_LEVEL * levelsGained
    : LINEAR_XP_MULTIPLIER * levelsGained * (levelsGained + 1n) / 2n;
}

export function createProgression(curve: XpCurve = 'linear-v1'): Progression {
  return { curve, level: 1, xp: 0, investments: {
    attributes: { prowess: 0, cunning: 0, resistance: 0 },
    skills: { combat: 0, subterfuge: 0, lore: 0 },
  } };
}

export function awardXp(progress: Progression, amount: number): Progression {
  return creditXp(progress, amount).progression;
}

function totalXp(progress: Progression): bigint {
  return xpForLevel(progress.level, progress.curve) + BigInt(progress.xp);
}

export function creditXp(progress: Progression, amount: number): { progression: Progression; creditedXp: number } {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { progression: progress, creditedXp: 0 };
  }
  const { curve } = progress;
  const previousTotal = totalXp(progress);
  const lastLevel = maxLevel(curve);
  const cappedTotal = xpForLevel(lastLevel + 1, curve) - 1n;
  const requestedTotal = previousTotal + BigInt(amount);
  const nextTotal = requestedTotal > cappedTotal ? cappedTotal : requestedTotal;
  const creditedXp = Number(nextTotal - previousTotal);
  if (creditedXp <= 0) return { progression: progress, creditedXp: 0 };

  let level = progress.level;
  let upper = lastLevel;
  while (level < upper) {
    const middle = level + Math.ceil((upper - level) / 2);
    if (xpForLevel(middle, curve) <= nextTotal) level = middle;
    else upper = middle - 1;
  }
  const xp = Number(nextTotal - xpForLevel(level, curve));
  return { progression: { ...progress, level, xp }, creditedXp };
}

export function availablePoints(progress: Progression): number {
  const { attributes, skills } = progress.investments;
  return progress.level - 1 - [...Object.values(attributes), ...Object.values(skills)].reduce((sum, rating) => sum + rating, 0);
}

export function progressionSummary(progress: Progression): string {
  const points = availablePoints(progress);
  const next = xpForLevel(progress.level + 1, progress.curve);
  return `Level ${progress.level} · ${totalXp(progress)} / ${next} total XP · ${points} ${points === 1 ? 'point' : 'points'} available`;
}

export function effectiveCharacter(base: Character, { investments }: Progression): Character {
  const { attributes, skills } = base;
  return {
    name: base.name,
    classId: base.classId,
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

export function hasSupportedCombatPools(character: Character): boolean {
  const {attack, defense} = getCombatPools(character, offenseFor(character.classId));
  return attack <= MAX_COMBAT_POOL && defense <= MAX_COMBAT_POOL;
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

export function parseProgression(value: unknown, legacy = false): Progression | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<Progression>;
  const { level, xp, investments } = input;
  const curve = legacy ? 'flat-v1' : input.curve;
  if (curve !== 'flat-v1' && curve !== 'linear-v1') return null;
  if (typeof level !== 'number' || !Number.isSafeInteger(level) || level < 1 || level > maxLevel(curve)
    || typeof xp !== 'number' || !Number.isSafeInteger(xp) || xp < 0) return null;
  if (BigInt(xp) >= xpForLevel(level + 1, curve) - xpForLevel(level, curve)) return null;
  const result = createProgression(curve);
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
