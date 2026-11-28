import { expect, test } from 'vitest';
import { awardXp, createProgression, spendPoint } from '../src/game/progression';
import { loadRoster, parseCheckpoint } from '../src/game/save';
import { MAX_COMBAT_POOL } from '../src/game/dice';
import { createRosterStore } from '../src/game/roster-store';
import { restartCheckpoint } from '../src/game/world';
import { makeCheckpoint } from './fixtures';

const key = 'game.save.v13';
const id = '00000000-0000-4000-8000-000000000001';

test('v8 roster preserves defeats, wave, and investments on upgrade to Warrior', () => {
  const checkpoint = makeCheckpoint();
  checkpoint.slimeLevel = 4;
  checkpoint.progression = spendPoint(awardXp({ ...checkpoint.progression, curve: 'flat-v1' }, 8), { group: 'skills', key: 'combat' });
  checkpoint.completedEncounterIds = ['slime-2'];
  const { classId, ...character } = checkpoint.character;
  const slot = { id, revision: 3, status: 'defeated' };
  const { level, xp, investments } = checkpoint.progression;
  const raw = JSON.stringify({ version: 8, slots: [{ ...slot, checkpoint: { ...checkpoint, version: 7, character, progression: { level, xp, investments } } }] });
  const storage = { getItem: (name: string) => name === 'game.save.v8' ? raw : null };
  expect(loadRoster(storage, key)).toEqual({ status: 'ready', legacy: 8, raw, roster: {
    version: 13, slots: [{ ...slot, checkpoint }],
  } });
});

test('current saves require a known class and Restart preserves it', () => {
  const checkpoint = makeCheckpoint();
  for (const value of [undefined, 'bard', null]) {
    expect(parseCheckpoint(JSON.stringify({ ...checkpoint, character: { ...checkpoint.character, classId: value } }))).toBeNull();
  }
  checkpoint.character.classId = 'wizard';
  checkpoint.slimeLevel = 4;
  expect(parseCheckpoint(JSON.stringify(checkpoint))).toEqual(checkpoint);
  expect(restartCheckpoint(checkpoint)).toMatchObject({ slimeLevel: 1, character: { classId: 'wizard' } });
});

test('only the active offensive pool limits Lore investments', async () => {
  const checkpoint = makeCheckpoint();
  checkpoint.progression = createProgression();
  checkpoint.progression.level = MAX_COMBAT_POOL;
  checkpoint.progression.investments.skills.lore = MAX_COMBAT_POOL - 4;
  for (const [classId, expected] of [['warrior', 'saved'], ['wizard', 'invalid']] as const) {
    checkpoint.character.classId = classId;
    const before = JSON.stringify({ version: 13, slots: [{ id, revision: 1, status: 'active', checkpoint }] });
    let raw = before;
    const store = createRosterStore({ getItem: () => raw, setItem: (_key, value) => { raw = value; } },
      { request: async (_key, run) => run() }, key);
    const result = await store.transact({ type: 'spendPoint', id, expectedRevision: 1, rating: { group: 'skills', key: 'lore' } });
    expect(result.kind).toBe(expected);
    expect(raw === before).toBe(classId === 'wizard');
  }
});

test('both current and stale autosaves cannot switch the class', async () => {
  const checkpoint = makeCheckpoint();
  const before = JSON.stringify({ version: 13, slots: [{ id, revision: 2, status: 'active', checkpoint }] });
  let raw = before;
  const store = createRosterStore({ getItem: () => raw, setItem: (_key, value) => { raw = value; } },
    { request: async (_key, run) => run() }, key);
  const switched = { ...checkpoint, character: { ...checkpoint.character, classId: 'wizard' as const } };
  for (const [expectedRevision, kind] of [[1, 'stale'], [2, 'invalid']] as const) {
    expect((await store.transact({ type: 'update', id, expectedRevision, checkpoint: switched, status: 'active' })).kind).toBe(kind);
  }
  expect(raw).toBe(before);
});
