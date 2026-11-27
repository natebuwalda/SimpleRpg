import { expect, test, vi } from 'vitest';
import { createBattle, resolveTurn } from '../src/game/battle';
import { createCharacterDraft, finishCharacter } from '../src/game/creation';
import { effectiveCharacter, spendPoint } from '../src/game/progression';
import { transition } from '../src/game/session';
import { makeCheckpoint } from './fixtures';

test('class selects the offense and Lore improves only Magic', () => {
  const checkpoint = makeCheckpoint();
  const warrior = { ...checkpoint.character, classId: 'warrior' as const };
  const wizard = { ...warrior, classId: 'wizard' as const };
  expect(createBattle(5, warrior)).toMatchObject({ offense: 'melee', heroPools: { attack: 5, defense: 4 } });
  expect(createBattle(5, wizard)).toMatchObject({ offense: 'magic', heroPools: { attack: 4, defense: 4 } });
  const progress = spendPoint({ ...checkpoint.progression, level: 2 }, { group: 'skills', key: 'lore' });
  expect(createBattle(5, effectiveCharacter(wizard, progress)).heroPools.attack).toBe(5);
  expect(createBattle(5, effectiveCharacter(warrior, progress)).heroPools.attack).toBe(5);
});

test('unauthorized attacks consume neither turns nor RNG, and Magic uses the usual damage rule', () => {
  const checkpoint = makeCheckpoint();
  checkpoint.character = { ...checkpoint.character, classId: 'wizard' };
  checkpoint.position = { x: 14, y: 15 };
  const state = transition({ kind: 'exploring', checkpoint }, { type: 'move', direction: 'right' });
  const rng = vi.fn(() => 0);
  expect(transition(state, { type: 'melee' }, rng)).toBe(state);
  expect(rng).not.toHaveBeenCalled();
  const battle = createBattle(5, checkpoint.character);
  expect(resolveTurn(battle, 'magic', rng)).toMatchObject({ result: 'active', enemyHp: 3 });
  let die = 0;
  expect(resolveTurn(battle, 'magic', () => die++ < 4 ? .8 : 0)).toMatchObject({ result: 'victory', lastTurn: { slime: null } });
});

test('creation requires an explicitly chosen class', () => {
  const { character } = makeCheckpoint();
  expect(createCharacterDraft().classId).toBeNull();
  expect(finishCharacter({ ...character, classId: null })).toBeNull();
  expect(finishCharacter({ ...character, classId: 'wizard' })).toMatchObject({ classId: 'wizard' });
});
