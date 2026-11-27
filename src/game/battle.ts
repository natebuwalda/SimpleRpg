import type { BattleState, Character } from './types';
import { getCombatPools, offenseFor, type CombatCommand } from './combat-actions';
import { rollOpposed, type RandomSource } from './dice';
import { FIRST_SLIME_LEVEL, slimeStats } from './slime';

export function createBattle(heroHp: number, character: Character, slimeLevel = FIRST_SLIME_LEVEL): BattleState {
  const offense = offenseFor(character.classId);
  return { offense, heroHp, slimeLevel, enemyHp: slimeStats(slimeLevel).maxHp, heroPools: getCombatPools(character, offense), lastTurn: null, result: 'active' };
}
export function resolveTurn(state: BattleState, command: CombatCommand, rng: RandomSource = Math.random): BattleState {
  if (state.result !== 'active') return state;
  if (command === 'run') return { ...state, result: 'escaped' };
  if (command !== state.offense) return state;
  const enemy = slimeStats(state.slimeLevel);
  const hero = rollOpposed(state.heroPools.attack, enemy.defense, rng);
  const enemyHp = Math.max(0, state.enemyHp - hero.damage);
  if (enemyHp === 0) return { ...state, enemyHp, lastTurn: { hero, slime: null }, result: 'victory' };
  const slime = rollOpposed(enemy.attack, state.heroPools.defense, rng);
  const heroHp = Math.max(0, state.heroHp - slime.damage);
  return { ...state, heroHp, enemyHp, lastTurn: { hero, slime }, result: heroHp === 0 ? 'defeat' : 'active' };
}
