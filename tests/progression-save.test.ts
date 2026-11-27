import { expect, test } from 'vitest';
import { createRosterStore } from '../src/game/roster-store';
import { loadRoster, parseCheckpoint, upgradeRoster } from '../src/game/save';
import { awardXp, createProgression } from '../src/game/progression';
import { makeCheckpoint } from './fixtures';

const id = '00000000-0000-4000-8000-000000000001';
const key = 'game.save.v8';
function oldSave() {
  const { progression, initialSlimes, ...previous } = makeCheckpoint();
  const checkpoint = { ...previous, version: 5, hp: 2 };
  return { version: 6, slots: [
    { id, revision: 3, status: 'active', checkpoint },
    { id: '00000000-0000-4000-8000-000000000002', revision: 2, status: 'defeated', checkpoint },
    { id: '00000000-0000-4000-8000-000000000003', revision: 1, status: 'active', checkpoint: { ...checkpoint, completedEncounterIds: checkpoint.world.slimes.map(s => s.id) } },
  ] };
}

test('v6 upgrade preserves all slots and never awards historical XP', () => {
  const old = oldSave();
  const upgraded = upgradeRoster(JSON.stringify(old))!;
  expect(upgraded.version).toBe(8);
  expect(upgraded.slots).toEqual(old.slots.map(slot => ({
    ...slot, checkpoint: { ...slot.checkpoint, slimeLevel: 1, version: 7, initialSlimes: slot.checkpoint.world.slimes, progression: createProgression() },
  })));
  expect(loadRoster({ getItem: name => name === key ? 'broken' : JSON.stringify(old) }, key).status).toBe('invalid');
});

test('failed upgrade preserves legacy data and a late legacy write cannot replace v8', async () => {
  const original = JSON.stringify(oldSave());
  const values = new Map([['game.save.v6', original]]);
  let blocked = true;
  const storage = {
    getItem: (name: string) => values.get(name) ?? null,
    setItem(name: string, raw: string) { if (blocked) throw Error('quota'); values.set(name, raw); },
  };
  const store = createRosterStore(storage, { request: async (_name, fn) => fn() }, key);
  expect((await store.transact({ type: 'upgrade' })).kind).toBe('write-failed');
  expect(values.get('game.save.v6')).toBe(original);
  expect(store.read().roster?.slots).toHaveLength(3);
  blocked = false;
  expect((await store.transact({ type: 'upgrade' })).kind).toBe('saved');
  values.set('game.save.v6', 'late write');
  expect(store.read().roster?.slots).toHaveLength(3);
});

test('autosave accepts accumulated victories once and guards transactional spends and waves', async () => {
  const checkpoint = makeCheckpoint();
  checkpoint.progression = awardXp(createProgression(), 4);
  let raw = JSON.stringify({ version: 8, slots: [{ id, revision: 1, status: 'active', checkpoint }] });
  const store = createRosterStore({ getItem: () => raw, setItem: (_key, next) => { raw = next; } }, { request: async (_name, fn) => fn() }, key, { newWaveRandom: () => 0 });
  const cleared = { ...checkpoint, completedEncounterIds: checkpoint.world.slimes.map(s => s.id) };
  const update = { type: 'update', id, expectedRevision: 1, checkpoint: cleared, status: 'active' } as const;
  expect((await store.transact(update)).kind).toBe('invalid');
  expect((await store.transact({ ...update, checkpoint: { ...cleared, progression: awardXp(checkpoint.progression, 3) } })).kind).toBe('saved');
  expect((await store.transact(update)).kind).toBe('stale');
  const spend = { type: 'spendPoint', id, expectedRevision: 2, rating: { group: 'skills', key: 'combat' } } as const;
  expect((await store.transact(spend)).kind).toBe('saved');
  expect((await store.transact(spend)).kind).toBe('stale');
  const find = { type: 'findMoreSlimes', id, expectedRevision: 3 } as const;
  expect((await store.transact(find)).kind).toBe('saved');
  expect((await store.transact(find)).kind).toBe('stale');
  expect(store.read().roster?.slots[0].checkpoint.progression).toMatchObject({ level: 2, xp: 2, investments: { skills: { combat: 1 } } });
});

test('rejects impossible investments and malformed baseline placements', () => {
  const checkpoint = makeCheckpoint();
  expect(parseCheckpoint(JSON.stringify({ ...checkpoint, initialSlimes: [] }))).toBeNull();
  checkpoint.progression.investments.skills.combat = 1;
  expect(parseCheckpoint(JSON.stringify(checkpoint))).toBeNull();
});

test('rejects saved builds whose dice pools would exceed supported roll size', () => {
  const checkpoint = makeCheckpoint();
  checkpoint.progression.level = 4_294_967_297;
  checkpoint.progression.investments.skills.combat = 4_294_967_296;
  expect(parseCheckpoint(JSON.stringify(checkpoint))).toBeNull();
});

test('a spend at the dice pool limit does not consume the point', async () => {
  const checkpoint = makeCheckpoint();
  checkpoint.progression.level = 1021;
  checkpoint.progression.investments.skills.combat = 1019;
  const raw = JSON.stringify({ version: 8, slots: [{ id, revision: 1, status: 'active', checkpoint }] });
  const store = createRosterStore({ getItem: () => raw, setItem: () => { throw Error('Unexpected write'); } }, { request: async (_name, fn) => fn() }, key);
  expect(store.read().roster?.slots).toHaveLength(1);
  expect((await store.transact({ type:'spendPoint', id, expectedRevision:1, rating:{group:'skills',key:'combat'} })).kind).toBe('invalid');
});
