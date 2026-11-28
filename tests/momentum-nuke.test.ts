import { expect, test, vi } from 'vitest';
import { canUseCombatCommand, createBattle, getBattlePools, resolveTurn } from '../src/game/battle';
import { transition } from '../src/game/session';
import type { BattleState } from '../src/game/types';
import { makeCheckpoint } from './fixtures';
import { scriptedFaces } from './rolls';

const miss = () => 0;
const starter = makeCheckpoint().character;
const wizard = { ...starter, classId: 'wizard' as const };
const slimeFirst = () => scriptedFaces(1,1,1,1,1,1, 8,1,1);
const moveRight = { type: 'move', direction: 'right' } as const;

test('a Momentum stack boosts only defense rolls that happen after it is gained', () => {
  const first = resolveTurn(createBattle(5, starter, 1, miss), 'momentum', scriptedFaces(8,1,1, 1,1,1,1,8));
  expect(first).toMatchObject({ heroHp: 5, enemyHp: 3, classAction: { kind: 'momentum', stacks: 1n }, lastTurn: [
    { kind: 'momentum', stacks: 1n },
    { kind: 'attack', attacker: 'slime', roll: { damage: 0, defense: { original: [1,1,1,1,8] } } },
  ] });
  const later = resolveTurn(createBattle(5, starter, 1, slimeFirst()), 'momentum', scriptedFaces(8,1,1, 1,1,1,1));
  expect(later).toMatchObject({ heroHp: 4, classAction: { stacks: 1n }, lastTurn: [
    { kind: 'attack', attacker: 'slime', roll: { damage: 1, defense: { original: [1,1,1,1] } } },
    { kind: 'momentum', stacks: 1n },
  ] });
});

test('Momentum accumulates and remains after using boosted Melee and Defense', () => {
  const battle = createBattle(5, starter, 1, miss);
  const stack = (state: BattleState) => resolveTurn(state, 'momentum', miss);
  const earned = resolveTurn(stack(battle), 'melee', miss);
  const two = stack(earned);
  const round = resolveTurn(two, 'melee', scriptedFaces(8,1,1,1,1,1,1, 1,1,1, 1,1,1, 1,1,1,1,1,1));
  expect(round).toMatchObject({ enemyHp: 2, classAction: { stacks: 2n }, lastTurn: [
    { kind: 'attack', attacker: 'hero', roll: { attack: { original: [8,1,1,1,1,1,1] } } },
    { kind: 'attack', attacker: 'slime', roll: { defense: { original: Array(6).fill(1) } } },
  ] });
  expect(round.heroPools).toEqual({ attack: 5, defense: 4 });
});

test('large Momentum counts remain exact, cap the dice, and cannot be paid with fewer Resources', () => {
  const battle = createBattle(5, starter, 1, miss);
  expect(getBattlePools({ ...battle, classAction: { kind: 'momentum', stacks: 1019n, currentResources: 0, maxResources: 5 } })).toEqual({ attack: 1024, defense: 1023 });
  const stacks = 9_007_199_254_740_993n;
  const rng = vi.fn(miss);
  const stacked: BattleState = { ...battle, classAction: { kind: 'momentum', stacks, currentResources: 5, maxResources: 5 } };
  expect(resolveTurn(stacked, 'momentum', rng)).toBe(stacked);
  expect(stacked.classAction).toMatchObject({ kind: 'momentum', stacks });
  expect(getBattlePools(stacked)).toEqual({ attack: 1024, defense: 1024 });
  expect(rng).not.toHaveBeenCalled();
});

test('Momentum clears after escape and defeat and a new encounter starts empty', () => {
  const checkpoint = { ...makeCheckpoint(), hp: 1, position: { x: 14, y: 15 } };
  const initial = transition({ kind: 'exploring', checkpoint }, moveRight, miss);
  const stacked = transition(initial, { type: 'momentum' }, miss);
  expect(stacked).toMatchObject({ battle: { classAction: { stacks: 1n } } });
  const escaped = transition(stacked, { type: 'run' }, miss);
  expect(transition(escaped, moveRight, miss)).toMatchObject({ battle: { classAction: { stacks: 0n } } });
  const defeated = transition(stacked, { type: 'melee' }, scriptedFaces(1,1,1,1,1,1, 1,1,1, 8,1,1, 1,1,1,1,1));
  expect(defeated.kind).toBe('defeat');
  const restarted = transition(defeated, { type: 'restart' });
  if (restarted.kind !== 'exploring') throw Error('Expected exploration');
  expect(transition({ ...restarted, checkpoint: { ...restarted.checkpoint, position: checkpoint.position } }, moveRight, miss))
    .toMatchObject({ battle: { classAction: { stacks: 0n } } });
});

test('Nuke bypasses defense and a lethal first action uses zero combat dice', () => {
  const rng = vi.fn(miss);
  const result = resolveTurn(createBattle(5, wizard, 1, miss), 'nuke', rng);
  expect(result).toMatchObject({ result: 'victory', enemyHp: 0, lastTurn: [{ kind: 'nuke', damage: 4 }] });
  expect(rng).not.toHaveBeenCalled();
});

test('a surviving slime attacks once and an earlier defeat cancels Nuke', () => {
  const rng = vi.fn(scriptedFaces(8,1,1,1,1, 1,1,1,1));
  const result = resolveTurn(createBattle(5, wizard, 3, miss), 'nuke', rng);
  expect(result).toMatchObject({ result: 'active', enemyHp: 1, heroHp: 4, lastTurn: [
    { kind: 'nuke', damage: 4 }, { kind: 'attack', attacker: 'slime' },
  ] });
  expect(rng).toHaveBeenCalledTimes(9);
  expect(resolveTurn(createBattle(1, wizard, 1, slimeFirst()), 'nuke', scriptedFaces(8,1,1, 1,1,1,1)))
    .toMatchObject({ result: 'defeat', enemyHp: 3, lastTurn: [{ kind: 'attack', attacker: 'slime' }] });
  expect(resolveTurn(createBattle(5, wizard, 1, slimeFirst()), 'nuke', scriptedFaces(8,1,1, 1,1,1,1)))
    .toMatchObject({ result: 'victory', lastTurn: [{ kind: 'attack', attacker: 'slime' }, { kind: 'nuke', damage: 4 }] });
});

test('advanced Cunning and Lore raise Nuke damage and victory credits XP and healing', () => {
  const checkpoint = { ...makeCheckpoint(), character: wizard, hp: 2, slimeLevel: 4, position: { x: 14, y: 15 } };
  checkpoint.progression.level = 4;
  checkpoint.progression.investments.attributes.cunning = 1;
  checkpoint.progression.investments.skills.lore = 2;
  const battle = transition({ kind: 'exploring', checkpoint }, moveRight, miss);
  expect(transition(battle, { type: 'nuke' }, () => { throw Error('Nuke tried to roll'); })).toMatchObject({
    kind: 'victory', xpAwarded: 4, lastTurn: [{ kind: 'nuke', damage: 7 }],
    checkpoint: { hp: 5, completedEncounterIds: ['slime-1'], progression: { xp: 4 } },
  });
});

test('wrong-class and concluded combat commands return the same state without rolls', () => {
  const rogue = { ...starter, classId: 'rogue' as const };
  const rng = vi.fn(miss);
  for (const [character, command] of [[starter, 'nuke'], [wizard, 'momentum'], [rogue, 'nuke'], [rogue, 'momentum']] as const) {
    const state = createBattle(5, character, 1, miss);
    expect(canUseCombatCommand(state, command)).toBe(false);
    expect(resolveTurn(state, command, rng)).toBe(state);
  }
  const concluded = { ...createBattle(5, wizard, 1, miss), result: 'escaped' as const };
  expect(resolveTurn(concluded, 'nuke', rng)).toBe(concluded);
  expect(rng).not.toHaveBeenCalled();
});
