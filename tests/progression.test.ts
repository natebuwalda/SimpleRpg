import { expect, test } from 'vitest';
import { availablePoints, awardXp, createProgression, creditXp, effectiveCharacter, progressionSummary, spendPoint, xpForLevel } from '../src/game/progression';
import { createCheckpoint, findMoreSlimes, generateWorld, restartCheckpoint } from '../src/game/world';
import { transition } from '../src/game/session';
import { makeCheckpoint } from './fixtures';

test('linear milestones bank one point per level and report lifetime XP', () => {
  const start = createProgression();
  expect(awardXp(start, 4)).toMatchObject({ level: 1, xp: 4 });
  expect(availablePoints(awardXp(start, 5))).toBe(1);
  expect(awardXp(start, 14)).toMatchObject({ level: 2, xp: 9 });
  expect(awardXp(start, 15)).toMatchObject({ level: 3, xp: 0 });
  const advanced = awardXp(start, 18);
  expect(advanced).toMatchObject({ level: 3, xp: 3 });
  expect(progressionSummary(advanced)).toBe('Level 3 · 18 / 30 total XP · 2 points available');
  expect([1, 2, 3, 4, 5, 6].map(level => xpForLevel(level, 'linear-v1'))).toEqual([0n, 5n, 15n, 30n, 50n, 75n]);
});

test('ten waves spread new and legacy levels without changing the total XP earned', () => {
  const wins = Array.from({ length: 30 }, (_, index) => Math.floor(index / 3) + 1);
  const linear = wins.reduce((progress, reward) => awardXp(progress, reward), createProgression());
  const flat = wins.reduce((progress, reward) => awardXp(progress, reward), createProgression('flat-v1'));
  expect(linear).toMatchObject({ level: 8, xp: 25 });
  expect(progressionSummary(linear)).toBe('Level 8 · 165 / 180 total XP · 7 points available');
  expect(flat).toMatchObject({ level: 34, xp: 0 });
  expect(progressionSummary(flat)).toBe('Level 34 · 165 / 170 total XP · 33 points available');
});

test('large XP awards and a capped legacy character use exact milestones', () => {
  const flat = createProgression('flat-v1');
  const advanced = awardXp(flat, Number.MAX_SAFE_INTEGER);
  expect(advanced).toMatchObject({ level: 1_801_439_850_948_199, xp: 1 });
  expect(progressionSummary(advanced)).toContain('9007199254740991 / 9007199254740995 total XP');
  const capped = { ...flat, level: Number.MAX_SAFE_INTEGER - 10, xp: 4 };
  expect(creditXp(capped, 1)).toEqual({ progression: capped, creditedXp: 0 });
});

test('exact linear awards can cross a milestone when the temporary XP sum is unsafe as a number', () => {
  const level = 1_801_439_850_948_197;
  const almost = { ...createProgression(), level, xp: 5 * level - 1 };
  const amount = 12;
  const result = creditXp(almost, amount);
  expect(result).toMatchObject({ progression: { level: level + 1, xp: 11 }, creditedXp: amount });
  expect(result.progression).toEqual(awardXp(awardXp(almost, 6), 6));
});

test('can raise a starting five, spend on either group, and reject overspending', () => {
  const base = { ...makeCheckpoint().character, skills: { combat: 5, lore: 0, subterfuge: 0 } };
  const earned = awardXp(createProgression(), 15);
  const combat = { group: 'skills', key: 'combat' } as const;
  const skilled = spendPoint(earned, combat);
  const stronger = spendPoint(skilled, { group: 'attributes', key: 'prowess' });
  expect(effectiveCharacter(base, stronger)).toMatchObject({ skills: { combat: 6 }, attributes: { prowess: 4 } });
  expect(availablePoints(stronger)).toBe(0);
  expect(spendPoint(stronger, combat)).toBe(stronger);
  expect(base.skills.combat).toBe(5);
});

test('winning grants one XP once, and entering battle uses the effective build', () => {
  const checkpoint = createCheckpoint(generateWorld(() => 0));
  checkpoint.progression = spendPoint(awardXp(createProgression(), 5), { group: 'skills', key: 'combat' });
  const battle = transition({ kind: 'exploring', checkpoint }, { type: 'move', direction: 'right' }, () => 0);
  expect(battle).toMatchObject({ kind: 'battle', battle: { heroPools: { attack: 6 } } });
  expect(transition(battle, { type: 'run' })).toMatchObject({ checkpoint: { progression: checkpoint.progression } });
  let roll = 0;
  const won = transition(battle, { type: 'melee' }, () => roll++ < 6 ? .8 : 0);
  expect(won).toMatchObject({ kind: 'victory', checkpoint: { progression: { level: 2, xp: 1 }, completedEncounterIds: ['slime-1'] } });
  expect(transition(won, { type: 'melee' })).toBe(won);
  expect(transition(won, { type: 'acknowledgeVictory' })).toMatchObject({ checkpoint: { progression: { xp: 1 } } });
});

test('finds a wave only after clearing and restarts with original placements and advancement', () => {
  const checkpoint = createCheckpoint(generateWorld(() => 0));
  expect(findMoreSlimes(checkpoint)).toBe(checkpoint);
  const cleared = { ...checkpoint, position: { x: 4, y: 3 }, completedEncounterIds: checkpoint.world.slimes.map(slime => slime.id), progression: awardXp(createProgression(), 10) };
  const wave = findMoreSlimes(cleared, () => 0);
  expect(wave.completedEncounterIds).toEqual([]);
  expect(wave.world.slimes.map(slime => slime.position)).toEqual([{ x: 5, y: 3 }, { x: 6, y: 3 }, { x: 7, y: 3 }]);
  expect(wave.position).toEqual(cleared.position);
  expect(restartCheckpoint(wave)).toMatchObject({ world: checkpoint.world, progression: cleared.progression, hp: 5, position: { x: 3, y: 3 } });
});
