import { expect, test } from 'vitest';
import { createRosterStore } from '../src/game/roster-store';
import { parseCheckpoint, parseRoster } from '../src/game/save';
import { transition } from '../src/game/session';
import { createCheckpoint, restartCheckpoint } from '../src/game/world';
import { makeCheckpoint, makeWorld } from './fixtures';

const current = 'game.save.v12';
const legacy = 'game.save.v11';
const id = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const locks = { request: async <T>(_name: string, run: () => Promise<T> | T) => run() };
const miss = () => 0;
const right = { type: 'move', direction: 'right' } as const;
const rogue = { ...makeCheckpoint().character, classId: 'rogue' as const };

test('locked v11 upgrade preserves all four classes and gives only the Rogue a new zero balance', async () => {
  const slots = (['warrior', 'wizard', 'rogue', 'cleric'] as const).map((classId, index) => {
    const checkpoint = { ...makeCheckpoint(), version: 10, character: { ...makeCheckpoint().character, classId },
      slimeLevel: 4, position: { x: 4, y: 3 }, completedEncounterIds: ['slime-1'], progression: { ...makeCheckpoint().progression, level: 2, xp: 3 } };
    return { id: id(index), revision: index + 2, status: index % 2 ? 'defeated' : 'active',
      checkpoint: { ...checkpoint, ...(classId === 'cleric' ? { currentResources: 4 } : {}) } };
  });
  const raw = JSON.stringify({ version: 11, slots });
  const data = new Map([[legacy, raw]]);
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const store = createRosterStore(storage, locks, current);
  expect(store.read()).toMatchObject({ status: 'ready', legacy: 11 });
  expect((await store.transact({ type: 'upgrade' })).kind).toBe('saved');
  expect(parseRoster(data.get(current)!)).toEqual({ version: 12, slots: slots.map(slot => ({
    ...slot, checkpoint: { ...slot.checkpoint, version: 11, ...(slot.checkpoint.character.classId === 'rogue' ? { currentResources: 0 } : {}) },
  })) });
  expect(data.get(legacy)).toBe(raw);
  data.set(current, 'broken');
  expect(store.read()).toMatchObject({ status: 'invalid', raw: 'broken', roster: null });
});

test('upgrade rejects a stored Rogue balance that was invalid in a v11 roster', () => {
  const checkpoint = { ...makeCheckpoint(), version: 10, character: rogue };
  for (const currentResources of [0, 3, null]) {
    const raw = JSON.stringify({ version: 11, slots: [
      { id: id(0), revision: 1, status: 'active', checkpoint: { ...checkpoint, currentResources } },
    ] });
    const store = createRosterStore({ getItem: key => key === legacy ? raw : null, setItem: () => {} }, locks, current);
    expect(store.read()).toMatchObject({ status: 'invalid', raw, roster: null });
  }
});

test('Rogue balances are required in current saves, persist through advancement, and reset to zero', async () => {
  const checkpoint = createCheckpoint(makeWorld(), rogue);
  expect(checkpoint.currentResources).toBe(0);
  for (const amount of [undefined, -1, 1.5, 6, null, '3']) {
    expect(parseCheckpoint(JSON.stringify({ ...checkpoint, currentResources: amount }))).toBeNull();
  }
  expect(parseCheckpoint(JSON.stringify({ ...makeCheckpoint(), currentResources: 3 }))).toBeNull();
  checkpoint.currentResources = 5;
  checkpoint.progression.level = 2;
  let raw = JSON.stringify({ version: 12, slots: [{ id: id(0), revision: 1, status: 'active', checkpoint }] });
  const store = createRosterStore({ getItem: () => raw, setItem: (_key, value) => { raw = value; } }, locks, current);
  const result = await store.transact({ type: 'spendPoint', id: id(0), expectedRevision: 1, rating: { group: 'attributes', key: 'cunning' } });
  expect(result).toMatchObject({ kind: 'saved', slot: { checkpoint: { currentResources: 5 } } });
  const saved = store.read().roster!.slots[0].checkpoint;
  expect(saved.currentResources).toBe(5);
  expect(restartCheckpoint(saved)).toMatchObject({ currentResources: 0, progression: saved.progression });
});

test('Rogue escape and victory carry balances, and a failed write retries the complete victory once', async () => {
  const checkpoint = { ...createCheckpoint(makeWorld(), rogue), currentResources: 2, hp: 2, position: { x: 14, y: 15 } };
  const battle = transition({ kind: 'exploring', checkpoint }, right, miss);
  const stacked = transition(battle, { type: 'melee' }, miss);
  const victory = transition(stacked, { type: 'exploit' }, miss);
  if (victory.kind !== 'victory') throw Error('Expected Exploit victory');
  expect(victory.checkpoint).toMatchObject({ currentResources: 3, hp: 5, progression: { xp: 1 } });
  expect(transition(stacked, { type: 'run' }, miss)).toMatchObject({ kind: 'exploring', checkpoint: { currentResources: 2, hp: 2 } });
  const higher = { ...checkpoint, slimeLevel: 2 };
  const highBattle = transition({ kind: 'exploring', checkpoint: higher }, right, miss);
  const woundedSlime = transition(transition(highBattle, { type: 'melee' }, miss), { type: 'exploit' }, miss);
  expect(transition(woundedSlime, { type: 'run' }, miss)).toMatchObject({ kind: 'exploring', checkpoint: { currentResources: 3, hp: 2 } });
  let raw = JSON.stringify({ version: 12, slots: [{ id: id(0), revision: 1, status: 'active', checkpoint }] });
  let blocked = true;
  const store = createRosterStore({ getItem: () => raw, setItem: (_key, value) => { if (blocked) throw Error('quota'); raw = value; } }, locks, current);
  const update = { type: 'update', id: id(0), expectedRevision: 1, status: 'active', checkpoint: victory.checkpoint } as const;
  expect((await store.transact(update)).kind).toBe('write-failed');
  expect(parseRoster(raw)?.slots[0].checkpoint).toEqual(checkpoint);
  blocked = false;
  expect((await store.transact(update)).kind).toBe('saved');
  expect((await store.transact(update)).kind).toBe('stale');
  expect(store.read().roster?.slots[0]).toMatchObject({ revision: 2, checkpoint: victory.checkpoint });
});
