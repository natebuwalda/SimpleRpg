import { expect, test } from 'vitest';
import { createStarterCharacter } from '../src/game/character';
import { createCheckpoint } from '../src/game/world';
import { loadSave, parseSave, saveGame } from '../src/game/save';
import { makeWorld } from './fixtures';

const old = { version: 3, world: makeWorld(), position: { x: 4, y: 3 }, hp: 12, completedEncounterIds: ['slime-2'] };
const modern = { ...old, version: 4, hp: 5, character: createStarterCharacter() };
test('new checkpoints and saved characters round trip at five Health', () => {
  expect(createCheckpoint(makeWorld())).toMatchObject({ version: 4, hp: 5, character: modern.character });
  let raw = '';
  expect(saveGame({ setItem(key, value) { expect(key).toBe('simple-rpg.save.v4'); raw = value; } }, modern as never)).toBe(true);
  expect(parseSave(raw)).toEqual(modern);
});
test.each([12, 6, 5, 2])('v3 migration caps old Health %i and preserves the entire world', hp => {
  const result = loadSave({ getItem: key => key.endsWith('v3') ? JSON.stringify({ ...old, hp }) : null }, () => { throw Error('Must not reroll'); });
  expect(result).toMatchObject({ status: 'ready', migrated: true, checkpoint: { ...modern, hp: Math.min(hp, 5) } });
});
test.each([0, 13, 1.5])('invalid old Health %i is never normalized into validity', hp => {
  expect(loadSave({ getItem: key => key.endsWith('v3') ? JSON.stringify({ ...old, hp }) : null }).status).toBe('invalid');
});
test('v4 validates starter data and never falls back past a present invalid save', () => {
  for (const change of [{ character: undefined }, { character: { ...modern.character, skills: { combat: 3, subterfuge: 2, lore: 1 } } }, { hp: 6 }, { hp: 0 }, { hp: 1.5 }]) {
    const reads: string[] = [];
    const result = loadSave({ getItem(key) { reads.push(key); return JSON.stringify(key.endsWith('v4') ? { ...modern, ...change } : old); } });
    expect(result.status).toBe('invalid');
    expect(reads).toEqual(['simple-rpg.save.v4']);
  }
});
test('wrong schema at a historical key is rejected without older fallback', () => {
  expect(loadSave({ getItem: key => key.endsWith('v3') ? JSON.stringify(modern) : null }).status).toBe('invalid');
});
