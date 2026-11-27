import { expect, test } from 'vitest';
import { createStarterCharacter, deriveStats, isStarterCharacter } from '../src/game/character';

import { getCombatPools } from '../src/game/combat-actions';

test('starter spending produces the agreed derived stats and melee pools', () => {
  const character = createStarterCharacter();
  expect(character).toEqual({ name: 'Adventurer', classId: 'warrior', attributes: { prowess: 3, cunning: 3, resistance: 2 }, skills: { combat: 2, subterfuge: 2, lore: 1 } });
  expect(deriveStats(character)).toEqual({ maxHp: 5, initiative: 6, resourceCapacity: 5 });
  expect(getCombatPools(character, 'melee')).toEqual({ attack: 5, defense: 4 });
});
test('starter instances cannot mutate each other', () => {
  const first = createStarterCharacter();
  first.attributes.prowess = 5;
  first.skills.combat = 5;
  expect(getCombatPools(createStarterCharacter(), 'melee')).toEqual({ attack: 5, defense: 4 });
});
test('only complete finite fixed starter values are accepted', () => {
  expect(isStarterCharacter(createStarterCharacter())).toBe(true);
  for (const value of [null, {}, { attributes: {} }, { ...createStarterCharacter(), skills: null }]) expect(isStarterCharacter(value)).toBe(false);
  for (const value of [4, 2.5, Infinity, NaN, undefined]) {
    const character = createStarterCharacter();
    Object.assign(character.attributes, { prowess: value });
    expect(isStarterCharacter(character)).toBe(false);
  }
});
