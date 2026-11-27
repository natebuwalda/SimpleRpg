export type RandomSource = () => number;
export type PoolRoll = { original: number[]; bonus: number[]; successes: number };
export type OpposedRoll = { attack: PoolRoll; defense: PoolRoll; damage: number };

// Combat retains individual die faces for the roll log.
export const MAX_COMBAT_POOL = 1024;

export function rollPool(size: number, rng: RandomSource = Math.random): PoolRoll {
  if (!Number.isInteger(size) || size < 0) throw new RangeError('Pool size must be a nonnegative integer');
  const die = () => 1 + Math.floor(rng() * 10);
  const original = Array.from({ length: size }, die);
  const bonus = original.filter(face => face === 10).map(die);
  return { original, bonus, successes: [...original, ...bonus].filter(face => face >= 8).length };
}
export function rollOpposed(attackSize: number, defenseSize: number, rng: RandomSource = Math.random): OpposedRoll {
  const attack = rollPool(attackSize, rng);
  const defense = rollPool(defenseSize, rng);
  return { attack, defense, damage: Math.max(0, attack.successes - defense.successes) };
}
