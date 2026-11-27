import { expect, test, vi } from 'vitest';
import { canUseCombatCommand, createBattle, resolveTurn } from '../src/game/battle';
import { transition } from '../src/game/session';
import { makeCheckpoint } from './fixtures';
import { scriptedFaces } from './rolls';

const rogue = { ...makeCheckpoint().character, classId: 'rogue' as const };
const miss = () => 0;
const open = () => createBattle(5, rogue, 1, miss);
const allMisses = Array<number>(7).fill(1);

test('only a first-acting Rogue can Exploit, with no rolls for a forbidden command', () => {
  const lateRng = scriptedFaces(1,1,1,1,1,1, 8,1,1);
  for (const state of [
    createBattle(5, makeCheckpoint().character, 1, miss),
    createBattle(5, rogue, 1, lateRng),
    { ...open(), result: 'escaped' as const },
  ]) {
    const rng = vi.fn(miss);
    expect(canUseCombatCommand(state, 'exploit')).toBe(false);
    expect(resolveTurn(state, 'exploit', rng)).toBe(state);
    expect(rng).not.toHaveBeenCalled();
  }
  expect(canUseCombatCommand(open(), 'exploit')).toBe(true);
});

test('Exploit uses its own pool and grants one stack per success before the slime acts', () => {
  const state = resolveTurn(open(), 'exploit', scriptedFaces(10,8,1,1,1,10, 8,1,1, 1,1,1,1));
  expect(state).toMatchObject({ heroHp: 4, enemyHp: 3, classAction: { kind: 'exploit', pool: 5, stacks: 3n }, lastTurn: [
    { kind: 'exploit', roll: { original: [10,8,1,1,1], bonus: [10], successes: 3 } },
    { kind: 'attack', attacker: 'slime', roll: { damage: 1 } },
  ] });
});

test('stacks accumulate, zero successes and ties preserve them, and a hit consumes them', () => {
  const first = resolveTurn(open(), 'exploit', scriptedFaces(8,1,1,1,1, ...allMisses));
  const second = resolveTurn(first, 'exploit', scriptedFaces(8,1,1,1,1, ...allMisses));
  const noSuccess = resolveTurn(second, 'exploit', miss);
  expect(noSuccess.classAction).toMatchObject({ stacks: 2n });
  expect(noSuccess.lastTurn).toHaveLength(2);
  const tied = resolveTurn(noSuccess, 'melee', scriptedFaces(8,1,1,1,1, 8,1,1, ...allMisses));
  expect(tied).toMatchObject({ enemyHp: 3, classAction: { kind: 'exploit', stacks: 2n } });
  const won = resolveTurn(tied, 'melee', scriptedFaces(8,1,1,1,1, 1,1,1));
  expect(won).toMatchObject({ result: 'victory', enemyHp: 0, classAction: { kind: 'exploit', stacks: 0n }, lastTurn: [
    { kind: 'attack', attacker: 'hero', roll: { damage: 1 }, exploitBonus: 2n },
  ] });
});

test('Exploit rolls are bounded and accumulated stacks remain exact', () => {
  const character = { ...rogue, skills: { ...rogue.skills, subterfuge: 2_000 } };
  const battle = createBattle(5, character, 1, miss);
  const stacks = 9_007_199_254_740_993n;
  const rng = vi.fn(scriptedFaces(8, ...Array<number>(1023).fill(1), ...allMisses));
  const round = resolveTurn({ ...battle, classAction: { kind: 'exploit', pool: 1024, stacks } }, 'exploit', rng);
  expect(battle.classAction).toMatchObject({ pool: 1024 });
  expect(round.classAction).toMatchObject({ stacks: stacks + 1n });
  expect(rng).toHaveBeenCalledTimes(1031);
  expect(resolveTurn(round, 'melee', scriptedFaces(8,1,1,1,1, 1,1,1))).toMatchObject({
    result: 'victory', lastTurn: [{ exploitBonus: stacks + 1n }],
  });
});

test('a surviving target loses its stacks after the first damaging hit', () => {
  const stacked = resolveTurn(open(), 'exploit', scriptedFaces(8,1,1,1,1, ...allMisses));
  const first = resolveTurn(stacked, 'melee', scriptedFaces(8,1,1,1,1, 1,1,1, ...allMisses));
  expect(first).toMatchObject({ result: 'active', enemyHp: 1, classAction: { kind: 'exploit', stacks: 0n } });
  const second = resolveTurn(first, 'melee', scriptedFaces(8,1,1,1,1, 1,1,1));
  expect(second).toMatchObject({ result: 'victory', lastTurn: [{ attacker: 'hero', exploitBonus: 0n }] });
});

test('escaping and re-entering starts with zero stacks and the same Rogue', () => {
  const step = { type: 'move', direction: 'right' } as const;
  const checkpoint = { ...makeCheckpoint(), character: rogue, position: { x: 14, y: 15 } };
  const battle = transition({ kind: 'exploring', checkpoint }, step, miss);
  const stacked = transition(battle, { type: 'exploit' }, scriptedFaces(8,8,1,1,1, ...allMisses));
  expect(stacked).toMatchObject({ battle: { classAction: { kind: 'exploit', stacks: 2n } } });
  const escaped = transition(stacked, { type: 'run' }, miss);
  expect(escaped).toEqual({ kind: 'exploring', checkpoint });
  expect(transition(escaped, step, miss)).toMatchObject({ battle: { classAction: { kind: 'exploit', stacks: 0n } } });
});
