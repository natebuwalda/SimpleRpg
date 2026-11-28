import { expect, test } from 'vitest';
import { isSlimeLevel, MAX_SLIME_LEVEL, slimeStats } from '../src/game/slime';
import { createBattle, resolveTurn } from '../src/game/battle';
import { findMoreSlimes, restartCheckpoint } from '../src/game/world';
import { transition } from '../src/game/session';
import { makeCheckpoint } from './fixtures';

test('slime stats scale from the original baseline within the recorded dice limit', () => {
  for (const level of [1, 2, 3, 1022]) {
    expect(isSlimeLevel(level)).toBe(true);
    expect(slimeStats(level)).toEqual({ maxHp: level + 2, attack: level + 2, defense: level + 2, initiative: level + 2, xp: level });
  }
  for (const invalid of [0, -1, 1.1, 1023, Infinity, '2', null]) expect(isSlimeLevel(invalid)).toBe(false);
});

test('level two uses four dice on defense and attack', () => {
  const checkpoint = makeCheckpoint();
  const battle = createBattle(checkpoint.hp, checkpoint.character, 2, () => 0);
  const turn = resolveTurn(battle, 'melee', () => 0);
  expect(turn.enemyHp).toBe(4);
  expect(turn.lastTurn).toMatchObject([
    { kind: 'attack', roll: { defense: { original: Array(4).fill(1) } } },
    { kind: 'attack', roll: { attack: { original: Array(4).fill(1) } } },
  ]);
  let roll = 0;
  expect(resolveTurn(battle, 'melee', () => roll++ < 5 ? .8 : 0)).toMatchObject({ result: 'victory', lastTurn: [{ attacker: 'hero' }] });
});

test('Find advances only a cleared wave and Restart restores level one', () => {
  const checkpoint = makeCheckpoint();
  const cleared = { ...checkpoint, completedEncounterIds: checkpoint.world.slimes.map(slime => slime.id) };
  const next = findMoreSlimes(cleared, () => 0);
  expect(next.slimeLevel).toBe(2);
  expect(next.completedEncounterIds).toEqual([]);
  expect(findMoreSlimes(next)).toBe(next);
  const final = { ...cleared, slimeLevel: MAX_SLIME_LEVEL };
  expect(findMoreSlimes(final)).toBe(final);
  expect(restartCheckpoint(next)).toMatchObject({ slimeLevel: 1, world: checkpoint.world, progression: checkpoint.progression });
});

test('a level eleven victory can grant three player levels at once', () => {
  const checkpoint = makeCheckpoint();
  checkpoint.progression.curve = 'flat-v1';
  checkpoint.slimeLevel = 11;
  checkpoint.position = { x: 14, y: 15 };
  checkpoint.progression.xp = 4;
  checkpoint.progression.level = 15;
  checkpoint.progression.investments.skills.combat = 14;
  let initiativeDie = 0;
  const battle = transition({ kind: 'exploring', checkpoint }, { type: 'move', direction: 'right' }, () => initiativeDie++ < 6 ? .8 : 0);
  let roll = 0;
  const won = transition(battle, { type: 'melee' }, () => roll++ < 19 ? .8 : 0);
  expect(won).toMatchObject({ kind: 'victory', xpAwarded: 11, levelGained: true, checkpoint: { progression: { level: 18, xp: 0 } } });
});

test('the final slime wave is clearable within the recorded dice limit', () => {
  const checkpoint = makeCheckpoint();
  checkpoint.slimeLevel = MAX_SLIME_LEVEL;
  checkpoint.position = { x: 14, y: 15 };
  checkpoint.completedEncounterIds = ['slime-2', 'slime-3'];
  checkpoint.progression.level = 1020;
  checkpoint.progression.investments.skills.combat = 1019;
  let initiativeDie = 0;
  const battle = transition({ kind: 'exploring', checkpoint }, { type: 'move', direction: 'right' }, () => initiativeDie++ < 6 ? .8 : 0);
  let roll = 0;
  const won = transition(battle, { type: 'melee' }, () => roll++ < 1024 ? .8 : 0);
  expect(won).toMatchObject({ kind: 'victory', xpAwarded: 1022 });
  if (won.kind !== 'victory') throw Error('Expected a victory');
  const attack = won.lastTurn?.[0];
  if (attack?.kind !== 'attack') throw Error('Expected a hero attack');
  expect(attack.roll.defense.original).toHaveLength(1024);
  expect(findMoreSlimes(won.checkpoint)).toBe(won.checkpoint);
});

test('victory reports credited rather than nominal XP at the player numeric limit', () => {
  const checkpoint = makeCheckpoint();
  checkpoint.position = { x: 14, y: 15 };
  checkpoint.progression.curve = 'flat-v1';
  checkpoint.progression.level = Number.MAX_SAFE_INTEGER - 10;
  checkpoint.progression.xp = 4;
  let initiativeDie = 0;
  const battle = transition({ kind: 'exploring', checkpoint }, { type: 'move', direction: 'right' }, () => initiativeDie++ < 6 ? .8 : 0);
  let roll = 0;
  expect(transition(battle, { type: 'melee' }, () => roll++ < 5 ? .8 : 0))
    .toMatchObject({ kind:'victory', xpAwarded:0, checkpoint:{progression:checkpoint.progression} });
});
