import { expect, test, vi } from 'vitest';
import { canUseCombatCommand, createBattle, resolveTurn } from '../src/game/battle';
import { getClericPool } from '../src/game/combat-actions';
import { effectiveCharacter } from '../src/game/progression';
import { makeCheckpoint } from './fixtures';
import { scriptedFaces } from './rolls';

const starter = makeCheckpoint().character;
const cleric = { ...starter, classId: 'cleric' as const };
const miss = () => 0;
const attackMisses = [1,1,1, 1,1,1,1];
const fourSuccesses = [10,8,8,10];
const open = (hp = 1, current = 3) => createBattle(hp, cleric, 1, miss, current);

test('Heal uses the pre-spend cap, bonus dice and missing HP', () => {
  const capped = resolveTurn(open(), 'heal', scriptedFaces(...fourSuccesses, ...attackMisses));
  expect(capped).toMatchObject({ heroHp: 4, classAction: { currentResources: 2, maxResources: 5 }, lastTurn: [
    { kind: 'heal', amount: 3, currentResources: 2, roll: { successes: 4, bonus: [10] } },
    { kind: 'attack', attacker: 'slime' },
  ] });
  expect(resolveTurn(open(4), 'heal', scriptedFaces(...fourSuccesses, ...attackMisses))).toMatchObject({
    heroHp: 5, classAction: { currentResources: 2 }, lastTurn: [{ kind: 'heal', amount: 1 }, { kind: 'attack' }],
  });
  expect(resolveTurn(open(5), 'heal', miss)).toMatchObject({
    heroHp: 5, classAction: { currentResources: 2 }, lastTurn: [{ kind: 'heal', amount: 0 }, { kind: 'attack' }],
  });
  expect(resolveTurn(open(), 'heal', miss)).toMatchObject({ heroHp: 1, classAction: { currentResources: 2 } });
});

test('Smite uses the pre-gain empty portion, skips defense and still gains on zero successes', () => {
  const round = resolveTurn(open(), 'smite', scriptedFaces(...fourSuccesses, ...attackMisses));
  expect(round).toMatchObject({ enemyHp: 1, classAction: { currentResources: 4 }, lastTurn: [
    { kind: 'smite', amount: 2, roll: { successes: 4 } }, { kind: 'attack', attacker: 'slime' },
  ] });
  expect(resolveTurn(open(), 'smite', miss)).toMatchObject({
    enemyHp: 3, classAction: { currentResources: 4 }, lastTurn: [{ kind: 'smite', amount: 0 }, { kind: 'attack' }],
  });
  const lethal = resolveTurn(open(5, 0), 'smite', scriptedFaces(...fourSuccesses));
  expect(lethal).toMatchObject({ result: 'victory', enemyHp: 0, classAction: { currentResources: 1 }, lastTurn: [
    { kind: 'smite', amount: 4, currentResources: 1 },
  ] });
});

test('resource bounds and class restrictions reject without taking a turn', () => {
  const rng = vi.fn(miss);
  const cases = [
    [open(5, 0), 'heal'], [open(5, 5), 'smite'],
    [createBattle(5, starter, 1, miss), 'heal'], [createBattle(5, starter, 1, miss), 'smite'],
    [open(5), 'nuke'],
  ] as const;
  for (const [battle, command] of cases) {
    expect(canUseCombatCommand(battle, command)).toBe(false);
    expect(resolveTurn(battle, command, rng)).toBe(battle);
  }
  expect(rng).not.toHaveBeenCalled();
});

test('both actions follow initiative, and a lethal earlier attack prevents their resource changes', () => {
  for (const command of ['heal', 'smite'] as const) {
    const battle = createBattle(1, cleric, 1, scriptedFaces(1,1,1,1,1,1, 8,1,1), 3);
    expect(resolveTurn(battle, command, scriptedFaces(8,1,1, 1,1,1,1))).toMatchObject({
      result: 'defeat', classAction: { currentResources: 3 }, lastTurn: [{ kind: 'attack', attacker: 'slime' }],
    });
  }
  const battle = createBattle(2, cleric, 1, scriptedFaces(1,1,1,1,1,1, 8,1,1), 3);
  expect(resolveTurn(battle, 'heal', scriptedFaces(8,1,1, 1,1,1,1, ...fourSuccesses)))
    .toMatchObject({ heroHp: 4, lastTurn: [{ kind: 'attack', attacker: 'slime' }, { kind: 'heal', amount: 3 }] });
});

test('Melee and Run use the normal pools without changing Resources', () => {
  const battle = open(5);
  expect(battle.heroPools).toEqual({ attack: 5, defense: 4 });
  expect(resolveTurn(battle, 'melee', scriptedFaces(8,1,1,1,1, 1,1,1, ...attackMisses)))
    .toMatchObject({ enemyHp: 2, classAction: { currentResources: 3 } });
  expect(resolveTurn(battle, 'run', () => { throw Error('Unexpected roll'); }))
    .toMatchObject({ result: 'escaped', classAction: { currentResources: 3 } });
});

test('earned Resistance and Lore contribute, and both actions cap their dice', () => {
  const progress = makeCheckpoint().progression;
  progress.level = 3;
  progress.investments.attributes.resistance = 1;
  progress.investments.skills.lore = 1;
  expect(getClericPool(effectiveCharacter(cleric, progress))).toBe(5);
  const large = { ...cleric, skills: { ...cleric.skills, lore: 2_000 } };
  for (const command of ['heal', 'smite'] as const) {
    const rng = vi.fn(miss);
    const round = resolveTurn(createBattle(1, large, 1, miss, 3), command, rng);
    expect(round.classAction).toMatchObject({ pool: 1024 });
    expect(rng).toHaveBeenCalledTimes(1031);
  }
});
