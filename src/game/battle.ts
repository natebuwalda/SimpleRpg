import type { BattleState, Character } from './types';
import { getMeleePools } from './character';
import { rollOpposed, type RandomSource } from './dice';
export const SLIME = { maxHp: 3, attack: 3, defense: 3 } as const;

export function createBattle(heroHp: number, character: Character): BattleState {
  return { heroHp, enemyHp: SLIME.maxHp, heroPools: getMeleePools(character), lastTurn: null, result: 'active' };
}
export function resolveTurn(state: BattleState, command: 'attack' | 'run', rng: RandomSource = Math.random): BattleState {
  if (state.result !== 'active') return state;
  if (command === 'run') return { ...state, result: 'escaped' };
  const hero = rollOpposed(state.heroPools.attack, SLIME.defense, rng);
  const enemyHp = Math.max(0, state.enemyHp - hero.damage);
  if (enemyHp === 0) return { ...state, enemyHp, lastTurn: { hero, slime: null }, result: 'victory' };
  const slime = rollOpposed(SLIME.attack, state.heroPools.defense, rng);
  const heroHp = Math.max(0, state.heroHp - slime.damage);
  return { ...state, heroHp, enemyHp, lastTurn: { hero, slime }, result: heroHp === 0 ? 'defeat' : 'active' };
}
