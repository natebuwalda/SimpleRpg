import { expect, test } from 'vitest';
import { createRosterStore } from '../src/game/roster-store';
import { loadRoster, parseCheckpoint, parseRoster, upgradeRoster } from '../src/game/save';
import { transition } from '../src/game/session';
import { createCheckpoint, restartCheckpoint } from '../src/game/world';
import { makeCheckpoint, makeWorld } from './fixtures';
import { scriptedFaces } from './rolls';

const id = '00000000-0000-4000-8000-000000000001';
const key = 'game.save.v11';
const oldKey = 'game.save.v10';
const cleric = { ...makeCheckpoint().character, classId: 'cleric' as const };
const locks = { request: async <T>(_name: string, run: () => Promise<T> | T) => run() };
const roster = (checkpoint = makeCheckpoint()) => ({ version: 11, slots: [{ id, revision: 1, status: 'active', checkpoint }] });

test('New Game initializes odd and even resource capacity and Restart uses the effective midpoint', () => {
  const odd = createCheckpoint(makeWorld(), cleric);
  expect(odd.currentResources).toBe(3);
  const even = createCheckpoint(makeWorld(), {
    ...cleric, attributes: { prowess: 4, cunning: 2, resistance: 2 },
  });
  expect(even.currentResources).toBe(2);
  odd.currentResources = 1;
  odd.progression.level = 3;
  odd.progression.investments.attributes.cunning = 2;
  expect(restartCheckpoint(odd)).toMatchObject({ currentResources: 4, progression: odd.progression });
});

test('the current save validates Cleric resources against effective capacity', () => {
  const checkpoint = createCheckpoint(makeWorld(), cleric);
  for (const currentResources of [undefined, null, 6, -1, 1.5, '3']) {
    expect(parseCheckpoint(JSON.stringify({ ...checkpoint, currentResources }))).toBeNull();
  }
  checkpoint.progression.level = 2;
  checkpoint.progression.investments.attributes.resistance = 1;
  expect(parseCheckpoint(JSON.stringify({ ...checkpoint, currentResources: 6 }))).toMatchObject({ currentResources: 6 });
  expect(parseCheckpoint(JSON.stringify({ ...makeCheckpoint(), currentResources: 1 }))).toBeNull();
});

test('spending advancement raises capacity without refilling Resources', async () => {
  const checkpoint = createCheckpoint(makeWorld(), cleric);
  checkpoint.progression.level = 2;
  checkpoint.currentResources = 1;
  let raw = JSON.stringify(roster(checkpoint));
  const store = createRosterStore({
    getItem: () => raw, setItem: (_key, value) => { raw = value; },
  }, locks, key);
  const updated = await store.transact({
    type: 'spendPoint', id, expectedRevision: 1, rating: { group: 'attributes', key: 'cunning' },
  });
  expect(updated).toMatchObject({ kind: 'saved', slot: { checkpoint: {
    currentResources: 1, progression: { investments: { attributes: { cunning: 1 } } },
  } } });
  expect(store.read().roster?.slots[0].checkpoint.currentResources).toBe(1);
});

test('v10 upgrade preserves prior classes and adventure data, with no unsafe fallback', async () => {
  const checkpoint = makeCheckpoint();
  checkpoint.character.classId = 'rogue';
  checkpoint.slimeLevel = 2;
  checkpoint.completedEncounterIds = ['slime-2'];
  checkpoint.progression.xp = 3;
  const slot = { ...roster(checkpoint).slots[0], revision: 4, status: 'defeated' };
  const old = { version: 10, slots: [{ ...slot, checkpoint: { ...checkpoint, version: 9 } }] };
  const raw = JSON.stringify(old);
  const data = new Map([[oldKey, raw]]);
  const storage = { getItem: (name: string) => data.get(name) ?? null, setItem: (name: string, value: string) => { data.set(name, value); } };
  const store = createRosterStore(storage, locks, key);
  expect(store.read()).toMatchObject({ status: 'ready', legacy: 10 });
  expect(await store.transact({ type: 'upgrade' })).toMatchObject({ kind: 'saved' });
  expect(parseRoster(data.get(key)!)).toEqual({ version: 11, slots: [slot] });
  expect(data.get(oldKey)).toBe(raw);
  data.set(key, 'broken');
  expect(loadRoster(storage, key)).toMatchObject({ status: 'invalid', raw: 'broken' });
  expect(upgradeRoster(JSON.stringify({ ...old, slots: [{ ...slot, checkpoint: { ...checkpoint, version: 9, character: cleric, currentResources: 3 } }] }))).toBeNull();
});

test.each([6, 7, 8, 9, 10])('legacy roster v%i rejects the Cleric class before canonicalizing', version => {
  const checkpoint = createCheckpoint(makeWorld(), cleric);
  const legacyCheckpoint = { ...checkpoint, version: version - 1 };
  const legacy = { version, slots: [{ ...roster(checkpoint).slots[0], checkpoint: legacyCheckpoint }] };
  expect(upgradeRoster(JSON.stringify(legacy))).toBeNull();
});

test('victory and escape keep battle Resources and a failed save can retry atomically', async () => {
  const checkpoint = { ...createCheckpoint(makeWorld(), cleric), currentResources: 1, hp: 2, position: { x: 14, y: 15 } };
  const battle = transition({ kind: 'exploring', checkpoint }, { type: 'move', direction: 'right' }, () => 0);
  const victory = transition(battle, { type: 'smite' }, scriptedFaces(8,8,8));
  if (victory.kind !== 'victory') throw Error('Expected Smite victory');
  expect(victory.checkpoint).toMatchObject({ currentResources: 2, hp: 5, progression: { xp: 1 } });
  const healed = transition(battle, { type: 'heal' }, scriptedFaces(8,1,1, 1,1,1, 1,1,1,1));
  expect(transition(healed, { type: 'run' }, () => 0)).toMatchObject({ kind: 'exploring', checkpoint: { currentResources: 0, hp: 3 } });
  let raw = JSON.stringify(roster(checkpoint));
  let blocked = true;
  const store = createRosterStore({
    getItem: () => raw,
    setItem: (_key, value) => { if (blocked) throw Error('quota'); raw = value; },
  }, locks, key);
  const update = { type: 'update', id, expectedRevision: 1, status: 'active', checkpoint: victory.checkpoint } as const;
  expect((await store.transact(update)).kind).toBe('write-failed');
  expect(parseRoster(raw)?.slots[0].checkpoint).toEqual(checkpoint);
  blocked = false;
  expect((await store.transact(update)).kind).toBe('saved');
  expect((await store.transact(update)).kind).toBe('stale');
  expect(store.read().roster?.slots[0].checkpoint).toEqual(victory.checkpoint);
});
