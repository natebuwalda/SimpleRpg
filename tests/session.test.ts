import { expect, it } from 'vitest';
import { createSession, transition } from '../src/game/session';

it('new game starts exploration', () => {
  expect(transition(createSession(), { type: 'newGame' })).toEqual({
    kind: 'exploring', checkpoint: { version: 1, position: { x: 2, y: 2 }, hp: 12, completedEncounterIds: [] },
  });
});
it('exploration updates position without mutating the old checkpoint', () => {
  const initial = transition(createSession(), { type: 'newGame' });
  expect(transition(initial, { type: 'move', direction: 'right' })).toMatchObject({ checkpoint: { position: { x: 3, y: 2 } } });
  expect(initial).toMatchObject({ checkpoint: { position: { x: 2, y: 2 } } });
});
