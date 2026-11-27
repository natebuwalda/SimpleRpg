import { expect, test } from 'vitest';
import { availablePoints, awardXp, createProgression, effectiveCharacter, progressionSummary, spendPoint } from '../src/game/progression';
import { createCheckpoint, findMoreSlimes, generateWorld, restartCheckpoint } from '../src/game/world';
import { transition } from '../src/game/session';
import { makeCheckpoint } from './fixtures';

test('earns and banks points, with one curve used to carry surplus XP', () => {
  const start = createProgression();
  expect(awardXp(start, 4)).toMatchObject({ level: 1, xp: 4 });
  expect(availablePoints(awardXp(start, 5))).toBe(1);
  expect(availablePoints(awardXp(start, 15))).toBe(3);
  const alternateCost = (level: number) => level * 3;
  const alternateProgress = awardXp(start, 10, alternateCost);
  expect(alternateProgress).toMatchObject({ level: 3, xp: 1 });
  expect(progressionSummary(alternateProgress, alternateCost)).toBe('Level 3 · 1 / 9 XP · 2 points available');
});

test('can raise a starting five, spend on either group, and reject overspending', () => {
  const base = { ...makeCheckpoint().character, skills: { combat: 5, lore: 0, subterfuge: 0 } };
  const earned = awardXp(createProgression(), 10);
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
  const battle = transition({ kind: 'exploring', checkpoint }, { type: 'move', direction: 'right' });
  expect(battle).toMatchObject({ kind: 'battle', battle: { heroPools: { attack: 6 } } });
  expect(transition(battle, { type: 'run' })).toMatchObject({ checkpoint: { progression: checkpoint.progression } });
  let roll = 0;
  const won = transition(battle, { type: 'attack' }, () => roll++ < 6 ? .8 : 0);
  expect(won).toMatchObject({ kind: 'victory', checkpoint: { progression: { level: 2, xp: 1 }, completedEncounterIds: ['slime-1'] } });
  expect(transition(won, { type: 'attack' })).toBe(won);
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
