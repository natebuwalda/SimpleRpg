import { MAX_COMBAT_POOL } from './progression';

export const FIRST_SLIME_LEVEL = 1;
export const MAX_SLIME_LEVEL = MAX_COMBAT_POOL - 2;

export function isSlimeLevel(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
    && value >= FIRST_SLIME_LEVEL && value <= MAX_SLIME_LEVEL;
}

export function slimeStats(level: number) {
  const rating = level + 2;
  return { maxHp: rating, attack: rating, defense: rating, xp: level };
}
