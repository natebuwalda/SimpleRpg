import { expect, test } from 'vitest';
import { awardXp } from '../src/game/progression';
import { createRosterStore } from '../src/game/roster-store';
import { loadRoster, parseRoster, upgradeRoster } from '../src/game/save';
import { makeCheckpoint, makeWorld } from './fixtures';

const current = 'game.save.v10';
const prior = 'game.save.v9';
const firstId = '00000000-0000-4000-8000-000000000001';
const secondId = '00000000-0000-4000-8000-000000000002';
const locks = { request: async <T>(_name: string, run: () => Promise<T> | T) => run() };

function storageWith(data: Map<string, string>) {
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

test('locked v9 migration preserves classes, slot state and source bytes', async () => {
  const warrior = makeCheckpoint();
  warrior.progression = awardXp(warrior.progression, 8);
  warrior.position = { x: 4, y: 3 };
  const wizard = makeCheckpoint();
  wizard.character.classId = 'wizard';
  wizard.slimeLevel = 4;
  wizard.completedEncounterIds = ['slime-2'];
  const slots = [
    { id: firstId, revision: 4, status: 'active', checkpoint: warrior },
    { id: secondId, revision: 7, status: 'defeated', checkpoint: wizard },
  ];
  const legacy = { version: 9, slots: slots.map(slot => ({ ...slot, checkpoint: { ...slot.checkpoint, version: 8 } })) };
  const raw = JSON.stringify(legacy);
  const data = new Map([[prior, raw]]);
  const storage = storageWith(data);
  const store = createRosterStore(storage, locks, current);
  expect(store.read()).toMatchObject({ legacy: 9, status: 'ready' });
  expect(await store.transact({ type: 'upgrade' })).toMatchObject({ kind: 'saved', roster: { version: 10, slots } });
  expect(data.get(prior)).toBe(raw);
  expect(parseRoster(data.get(current)!)).toEqual({ version: 10, slots });
  data.set(current, 'broken');
  expect(loadRoster(storage, current)).toMatchObject({ status: 'invalid', raw: 'broken', roster: null });
  legacy.slots[0].checkpoint.character = { ...warrior.character, classId: 'rogue' };
  expect(upgradeRoster(JSON.stringify(legacy))).toBeNull();
});

test('Rogue saves preserve class through reload and Restart and reject class edits', async () => {
  const data = new Map<string, string>();
  const storage = storageWith(data);
  const store = createRosterStore(storage, locks, current, { newId: () => firstId, newWorld: makeWorld });
  const character = { ...makeCheckpoint().character, classId: 'rogue' as const };
  const created = await store.transact({ type: 'create', character });
  if (created.kind !== 'saved' || !created.slot) throw Error('Expected saved Rogue');
  const { checkpoint } = created.slot;
  const reloaded = createRosterStore(storage, locks, current);
  expect(reloaded.read().roster?.slots[0].checkpoint.character).toEqual(character);
  expect(await reloaded.transact({
    type: 'update', id: firstId, expectedRevision: 1, status: 'active',
    checkpoint: { ...checkpoint, character: { ...character, classId: 'warrior' } },
  })).toMatchObject({ kind: 'invalid' });
  expect(await reloaded.transact({ type: 'update', id: firstId, expectedRevision: 1, status: 'defeated', checkpoint })).toMatchObject({ kind: 'saved' });
  expect(await reloaded.transact({ type: 'restart', id: firstId, expectedRevision: 2 })).toMatchObject({
    kind: 'saved', slot: { status: 'active', checkpoint: { version: 9, character } },
  });
});
