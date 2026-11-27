import { expect, it } from 'vitest';
import { createBattle, resolveTurn } from '../src/game/battle';
import { createStarterCharacter } from '../src/game/character';
import { scriptedFaces, losingFaces } from './rolls';

const battle = (hp = 5) => createBattle(hp, createStarterCharacter(), 1, () => 0);
const noRoll = () => { throw Error('Unexpected roll'); };
it('uses hero 5/4 and slime 3/3 pools and records each opposed margin', () => {
  const first = resolveTurn(battle(), 'melee', scriptedFaces(8,8,8,1,1, 8,1,1, 8,8,8, 1,1,1,1));
  expect(first).toMatchObject({ heroHp: 2, enemyHp: 1, result: 'active', heroPools: { attack: 5, defense: 4 } });
  expect(first.lastTurn?.[0].roll).toEqual({ attack: { original: [8,8,8,1,1], bonus: [], successes: 3 }, defense: { original: [8,1,1], bonus: [], successes: 1 }, damage: 2 });
  expect(first.lastTurn?.[1].roll).toMatchObject({ attack: { original: [8,8,8], successes: 3 }, defense: { original: [1,1,1,1], successes: 0 }, damage: 3 });
});
it('lethal attacks clamp slime Health and never roll a counterattack', () => {
  const victory = resolveTurn(battle(2), 'melee', scriptedFaces(8,8,8,8,8, 1,1,1));
  expect(victory).toMatchObject({ heroHp: 2, enemyHp: 0, result: 'victory', lastTurn: [{ attacker: 'hero' }] });
  expect(resolveTurn(victory, 'run', noRoll)).toBe(victory);
  expect(resolveTurn(victory, 'melee', noRoll)).toBe(victory);
});
it('run succeeds without rolling', () => {
  expect(resolveTurn(battle(), 'run', noRoll)).toMatchObject({ heroHp: 5, enemyHp: 3, result: 'escaped', lastTurn: null });
});
it('defeat clamps hero Health and terminal states consume no dice', () => {
  const defeated = resolveTurn(battle(1), 'melee', scriptedFaces(...losingFaces));
  expect(defeated).toMatchObject({ heroHp: 0, enemyHp: 3, result: 'defeat' });
  expect(resolveTurn(defeated, 'melee', noRoll)).toBe(defeated);
});
it('ties, misses and winning defenses never deal damage', () => {
  const tied = resolveTurn(battle(), 'melee', scriptedFaces(...Array(15).fill(1)));
  expect(tied).toMatchObject({ heroHp: 5, enemyHp: 3, result: 'active' });
  const defended = resolveTurn(battle(), 'melee', scriptedFaces(1,1,1,1,1, 8,8,8, 1,1,1, 8,8,8,8));
  expect(defended).toMatchObject({ heroHp: 5, enemyHp: 3, result: 'active' });
});
