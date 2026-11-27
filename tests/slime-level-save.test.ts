import { expect, test } from 'vitest';
import { awardXp } from '../src/game/progression';
import { createRosterStore } from '../src/game/roster-store';
import type { SaveLocks } from '../src/game/save-coordinator';
import { loadRoster, parseCheckpoint, upgradeRoster } from '../src/game/save';
import { MAX_SLIME_LEVEL } from '../src/game/slime';
import { makeCheckpoint } from './fixtures';
import type { Checkpoint } from '../src/game/types';

const id = '00000000-0000-4000-8000-000000000001';
const key = 'game.save.v8';
const locks: SaveLocks = { request: async (_name, run) => run() };

function fixture(checkpoint: Checkpoint) {
  const data = new Map([[key, JSON.stringify({ version: 8, slots: [{ id, revision: 1, status: 'active', checkpoint }] })]]);
  let blocked = false;
  const storage = {
    getItem: (name: string) => data.get(name) ?? null,
    setItem(name: string, value: string) {
      if (blocked) throw Error('quota');
      data.set(name, value);
    },
  };
  return { data, storage, block: (value: boolean) => { blocked = value; }, store: createRosterStore(storage, locks, key, { newWaveRandom: () => 0 }) };
}

test('v7 migration preserves progressed and defeated slots with later placements', () => {
  const checkpoint = makeCheckpoint();
  checkpoint.world.slimes[0].position = { x: 4, y: 3 };
  checkpoint.completedEncounterIds = ['slime-1'];
  checkpoint.progression = awardXp(checkpoint.progression, 9);
  const { slimeLevel, ...previous } = checkpoint;
  const slot = { id, revision: 7, status: 'defeated', checkpoint: { ...previous, version: 6 } };
  const old = JSON.stringify({ version: 7, slots: [slot] });
  expect(upgradeRoster(old)?.slots[0]).toEqual({ ...slot, checkpoint: { ...checkpoint, slimeLevel: 1 } });
  expect(loadRoster({ getItem: name => name.endsWith('.v7') ? 'broken' : name.endsWith('.v6') ? '{}' : null }, key)).toMatchObject({ status:'invalid', legacy:7 });
});

test('a reset confirmation cannot transfer between two fallback keys containing the same bytes', async () => {
  const { data, store } = fixture(makeCheckpoint());
  data.delete(key);
  data.set('game.save.v6', 'broken');
  const observed = store.read();
  data.set('game.save.v7', 'broken');
  expect(observed.legacy).toBe(6);
  expect((await store.transact({ type:'reset', expectedRaw:'broken', legacy: observed.legacy })).kind).toBe('stale');
  expect(data.has(key)).toBe(false);
});

test('Find persists level and placements together and stops at the dice limit', async () => {
  const checkpoint = makeCheckpoint();
  checkpoint.completedEncounterIds = checkpoint.world.slimes.map(slime => slime.id);
  const { data, store, block } = fixture(checkpoint);
  const before = data.get(key);
  const find = { type:'findMoreSlimes', id, expectedRevision:1 } as const;
  block(true);
  expect((await store.transact(find)).kind).toBe('write-failed');
  expect(data.get(key)).toBe(before);
  block(false);
  expect((await store.transact(find)).kind).toBe('saved');
  expect((await store.transact(find)).kind).toBe('stale');
  expect(store.read().roster?.slots[0].checkpoint).toMatchObject({ slimeLevel:2, completedEncounterIds:[] });
  expect((await fixture({...checkpoint,slimeLevel:MAX_SLIME_LEVEL}).store.transact(find)).kind).toBe('invalid');
});

test('a level three autosave requires six XP for two wins and cannot change wave level', async () => {
  const checkpoint = {...makeCheckpoint(),slimeLevel:3};
  const { store } = fixture(checkpoint);
  const completed = {...checkpoint,completedEncounterIds:['slime-1','slime-2'] as Checkpoint['completedEncounterIds']};
  const update = { type:'update', id, expectedRevision:1, status:'active' } as const;
  expect((await store.transact({...update,checkpoint:{...completed,progression:awardXp(checkpoint.progression,2)}})).kind).toBe('invalid');
  const earned = {...completed,progression:awardXp(checkpoint.progression,6)};
  expect((await store.transact({...update,checkpoint:{...earned,slimeLevel:4}})).kind).toBe('invalid');
  expect((await store.transact({...update,checkpoint:earned})).kind).toBe('saved');
  expect((await store.transact({...update,checkpoint:earned})).kind).toBe('stale');
  expect(parseCheckpoint(JSON.stringify({...earned,slimeLevel:1023}))).toBeNull();
});

test('a grouped retry matches sequential wins at the player numeric ceiling', async () => {
  const checkpoint = { ...makeCheckpoint(), slimeLevel: 4 };
  checkpoint.progression.level = Number.MAX_SAFE_INTEGER - 11;
  const { store } = fixture(checkpoint);
  let progression = checkpoint.progression;
  for (let wins = 0; wins < 3; wins++) progression = awardXp(progression, 4);
  const next = { ...checkpoint, progression, completedEncounterIds: checkpoint.world.slimes.map(slime => slime.id) };
  expect((await store.transact({ type:'update', id, expectedRevision:1, status:'active', checkpoint:next })).kind).toBe('saved');
  expect(store.read().roster?.slots[0].checkpoint.progression).toMatchObject({ level:Number.MAX_SAFE_INTEGER-10, xp:4 });
});
