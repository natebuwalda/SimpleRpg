import { expect, test, vi } from 'vitest';
import { canUseCombatCommand, createBattle, resolveTurn } from '../src/game/battle';
import { makeCheckpoint } from './fixtures';
import { scriptedFaces } from './rolls';

const starter = makeCheckpoint().character;
const rogue = { ...starter, classId: 'rogue' as const };
const wizard = { ...starter, classId: 'wizard' as const };
const miss = () => 0;
const slimeFirst = () => scriptedFaces(1,1,1,1,1,1, 8,1,1);

test('Warrior gains for Melee misses and damaging hits and respects capacity', () => {
  const battle = createBattle(5, starter, 1, miss);
  expect(battle.classAction).toMatchObject({ kind: 'momentum', currentResources: 0, maxResources: 5 });
  const melee = resolveTurn(battle, 'melee', scriptedFaces(1,1,1,1,1, 1,1,1, 8,1,1, 1,1,1,1));
  expect(melee).toMatchObject({ heroHp: 4, classAction: { currentResources: 2 }, lastTurn: [
    { attacker: 'hero', resourceGain: 1 }, { attacker: 'slime', resourceGain: 1 },
  ] });
  const noDamage = resolveTurn(melee, 'melee', miss);
  expect(noDamage.classAction).toMatchObject({ currentResources: 3 });
  expect(resolveTurn(resolveTurn(resolveTurn(noDamage, 'melee', miss), 'melee', miss), 'melee', miss).classAction)
    .toMatchObject({ currentResources: 5 });
});

test('Momentum charges existing stacks; Execute is strict and clears encounter state', () => {
  const battle = createBattle(5, starter, 1, miss);
  const first = resolveTurn(battle, 'momentum', miss);
  expect(first.classAction).toMatchObject({ stacks: 1n, currentResources: 0 });
  expect(resolveTurn(first, 'momentum', miss)).toBe(first);
  const earned = resolveTurn(first, 'melee', miss);
  const second = resolveTurn(earned, 'momentum', miss);
  expect(second.classAction).toMatchObject({ stacks: 2n, currentResources: 0 });
  const equal = { ...second, classAction: { kind: 'momentum' as const, stacks: 2n, currentResources: 3, maxResources: 5 } };
  const rng = vi.fn(miss);
  expect(canUseCombatCommand(equal, 'execute')).toBe(false);
  expect(resolveTurn(equal, 'execute', rng)).toBe(equal);
  const executable = { ...equal, enemyHp: 2 };
  expect(resolveTurn(executable, 'execute', rng)).toMatchObject({
    result: 'victory', enemyHp: 0, classAction: { stacks: 0n, currentResources: 0 }, lastTurn: [{ kind: 'execute' }],
  });
  expect(rng).not.toHaveBeenCalled();
  expect(resolveTurn(executable, 'run', rng).classAction).toMatchObject({ stacks: 0n, currentResources: 0 });
  const doomed = { ...createBattle(1, starter, 1, slimeFirst()), enemyHp: 2, classAction: equal.classAction };
  expect(resolveTurn(doomed, 'execute', scriptedFaces(8,1,1, 1,1,1,1,1,1))).toMatchObject({
    result: 'defeat', enemyHp: 2, classAction: { stacks: 0n, currentResources: 0 }, lastTurn: [{ attacker: 'slime' }],
  });
});

test('Rogue Melee builds stacks on misses and Exploit converts them before dealing direct damage', () => {
  let battle = createBattle(5, rogue, 1, miss, 3);
  const rng = vi.fn(miss);
  expect(resolveTurn(battle, 'exploit', rng)).toBe(battle);
  expect(rng).not.toHaveBeenCalled();
  for (let i = 0; i < 3; i++) battle = resolveTurn(battle, 'melee', miss);
  expect(battle).toMatchObject({ enemyHp: 3, classAction: { currentResources: 3, stacks: 3n } });
  const hit = resolveTurn(battle, 'melee', scriptedFaces(8,1,1,1,1, 1,1,1, 1,1,1, 1,1,1,1));
  expect(hit).toMatchObject({ enemyHp: 2, classAction: { stacks: 4n, currentResources: 3 } });
  expect(resolveTurn(battle, 'exploit', rng)).toMatchObject({
    result: 'victory', classAction: { currentResources: 5, stacks: 0n }, lastTurn: [
      { kind: 'exploit', damage: 5, stacks: 3n, resourceGain: 2, currentResources: 5 },
    ],
  });
  expect(rng).not.toHaveBeenCalled();
});

test('a Rogue entering at zero can Prepare and win the next round’s initiative tie-break', () => {
  const opening = createBattle(5, rogue, 1, slimeFirst(), 0);
  expect(opening.classAction.currentResources).toBe(1);
  expect(canUseCombatCommand(opening, 'prepare')).toBe(true);
  const stacked = resolveTurn(opening, 'melee', miss);
  expect(canUseCombatCommand(stacked, 'exploit')).toBe(false);
  const prepared = resolveTurn(stacked, 'prepare', scriptedFaces(8,1,1, 1,1,1,1));
  expect(prepared).toMatchObject({ heroHp: 4, classAction: { currentResources: 0, stacks: 1n }, turnOrder: [
    { combatant: 'hero', successes: 1 }, { combatant: 'slime', successes: 1 },
  ], lastTurn: [{ attacker: 'slime' }, { kind: 'prepare', successes: 1 }] });
  expect(canUseCombatCommand(prepared, 'prepare')).toBe(false);
  expect(canUseCombatCommand(prepared, 'exploit')).toBe(true);
});

test('Study reserves a chosen amount, shields every hit, and releases at zero available', () => {
  const battle = createBattle(5, wizard, 9, scriptedFaces(8,1,1,1,1,1, ...Array(11).fill(1)));
  expect(battle.classAction).toMatchObject({ currentResources: 5, maxResources: 5, reservedResources: 0 });
  const rng = vi.fn(miss);
  for (const invalid of [undefined, 0, -1, 1.5, 6, Infinity]) {
    expect(resolveTurn(battle, 'study', rng, invalid)).toBe(battle);
  }
  expect(rng).not.toHaveBeenCalled();
  const incoming = [8,8,8, ...Array(8).fill(1), 1,1,1,1];
  const shield = resolveTurn(battle, 'study', scriptedFaces(...incoming), 3);
  expect(shield).toMatchObject({ heroHp: 5, classAction: { currentResources: 2, reservedResources: 3 }, lastTurn: [
    { kind: 'study', reservedResources: 3 }, { attacker: 'slime', absorbed: 3 },
  ] });
  const nukeRound = [...Array(11).fill(1), ...incoming];
  const once = resolveTurn(shield, 'nuke', scriptedFaces(...nukeRound));
  const twice = resolveTurn(once, 'nuke', scriptedFaces(...nukeRound));
  expect(twice).toMatchObject({ heroHp: 5, enemyHp: 3, classAction: { currentResources: 0, reservedResources: 3 }, lastTurn: [
    { kind: 'nuke', damage: 4, currentResources: 0 }, { attacker: 'slime', absorbed: 3 },
  ] });
  expect(resolveTurn(twice, 'nuke', rng)).toBe(twice);
  const released = resolveTurn(twice, 'study', scriptedFaces(...incoming));
  expect(released).toMatchObject({ heroHp: 2, classAction: { currentResources: 3, reservedResources: 0 }, lastTurn: [
    { kind: 'study', reservedResources: 0 }, { attacker: 'slime' },
  ] });
});

test('a later Study cannot change an earlier hit and an earlier defeat prevents it', () => {
  const opening = createBattle(5, wizard, 1, slimeFirst());
  const hit = [8,8,1, 1,1,1,1];
  const reserved = resolveTurn(opening, 'study', scriptedFaces(...hit), 2);
  expect(reserved).toMatchObject({ heroHp: 3, lastTurn: [{ attacker: 'slime' }, { kind: 'study', reservedResources: 2 }] });
  expect(resolveTurn(reserved, 'study', scriptedFaces(...hit))).toMatchObject({
    heroHp: 3, lastTurn: [{ attacker: 'slime', absorbed: 2 }, { kind: 'study', reservedResources: 0 }],
  });
  expect(resolveTurn({ ...opening, heroHp: 1 }, 'study', scriptedFaces(...hit), 2)).toMatchObject({
    result: 'defeat', lastTurn: [{ attacker: 'slime' }], classAction: { reservedResources: 0 },
  });
});
