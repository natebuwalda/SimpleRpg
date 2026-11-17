import { expect, it } from 'vitest';
import { createBattle, resolveTurn } from '../src/game/battle';

it('retaliates only while the enemy survives', () => {
  const first = resolveTurn(createBattle(12), 'attack');
  expect(first).toEqual({ heroHp: 10, enemyHp: 2, result: 'active' });
  expect(resolveTurn(first, 'attack')).toEqual({ heroHp: 10, enemyHp: 0, result: 'victory' });
});
it('run succeeds without retaliation', () => expect(resolveTurn(createBattle(12), 'run')).toEqual({ heroHp: 12, enemyHp: 6, result: 'escaped' }));
it('defeat clamps HP and terminal states ignore commands', () => {
  const defeated = resolveTurn(createBattle(1), 'attack');
  expect(defeated).toEqual({ heroHp: 0, enemyHp: 2, result: 'defeat' });
  expect(resolveTurn(defeated, 'attack')).toEqual(defeated);
  const victory = resolveTurn({ heroHp: 2, enemyHp: 2, result: 'active' }, 'attack');
  expect(victory).toEqual({ heroHp: 2, enemyHp: 0, result: 'victory' });
  expect(resolveTurn(victory, 'run')).toEqual(victory);
});
