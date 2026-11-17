import type { BattleState } from './types';

export function createBattle(heroHp: number): BattleState {
  return { heroHp, enemyHp: 6, result: 'active' };
}
export function resolveTurn(state: BattleState, command: 'attack' | 'run'): BattleState {
  if (state.result !== 'active') return state;
  if (command === 'run') return { ...state, result: 'escaped' };
  const enemyHp = Math.max(0, state.enemyHp - 4);
  if (enemyHp === 0) return { ...state, enemyHp, result: 'victory' };
  const heroHp = Math.max(0, state.heroHp - 2);
  return { heroHp, enemyHp, result: heroHp === 0 ? 'defeat' : 'active' };
}
