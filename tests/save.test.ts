import { expect, it } from 'vitest';
import { loadSave, parseSave, saveGame } from '../src/game/save';

const checkpoint = { version: 1 as const, position: { x: 2, y: 2 }, hp: 12, completedEncounterIds: [] as string[] };
it('round trips a valid checkpoint', () => {
  let raw: string | null = null;
  expect(saveGame({ setItem(key, value) { expect(key).toBe('simple-rpg.save.v1'); raw = value; } }, checkpoint)).toBe(true);
  expect(loadSave({ getItem: () => raw })).toEqual({ checkpoint, status: 'ready' });
});
it.each([
  'invalid', 'null', '[]', '7', '{}',
  JSON.stringify({ ...checkpoint, version: 2 }),
  ...[0, 13, 1.5, '12', null].map(hp => JSON.stringify({ ...checkpoint, hp })),
  ...[{ x: 0, y: 2 }, { x: 10, y: 2 }, { x: 4, y: 3 }, { x: 2.5, y: 2 }, { x: 6, y: 4 }, null].map(position => JSON.stringify({ ...checkpoint, position })),
  ...[['unknown'], ['slime-1', 'slime-1'], [5], null].map(completedEncounterIds => JSON.stringify({ ...checkpoint, completedEncounterIds })),
])('rejects an invalid save: %s', raw => expect(parseSave(raw)).toBeNull());
it('allows standing on a completed encounter tile', () => {
  const completed = { ...checkpoint, position: { x: 6, y: 4 }, completedEncounterIds: ['slime-1'] };
  expect(parseSave(JSON.stringify(completed))).toEqual(completed);
});
it('distinguishes empty and corrupt saves', () => {
  expect(loadSave({ getItem: () => null })).toEqual({ checkpoint: null, status: 'empty' });
  expect(loadSave({ getItem: () => 'broken' })).toEqual({ checkpoint: null, status: 'invalid' });
});
it('handles blocked reads and quota failures', () => {
  expect(loadSave({ getItem() { throw new Error('blocked'); } })).toEqual({ checkpoint: null, status: 'unavailable' });
  expect(saveGame({ setItem() { throw new Error('full'); } }, checkpoint)).toBe(false);
});
