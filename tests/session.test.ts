import { expect, it } from 'vitest';
import { createSession, transition } from '../src/game/session';
import type { GameState } from '../src/game/types';

it('new game starts exploration', () => {
  expect(transition(createSession(), { type: 'newGame' })).toEqual({
    kind: 'exploring', checkpoint: { version: 1, position: { x: 2, y: 2 }, hp: 12, completedEncounterIds: [] },
  });
});

function encounter(hp = 12): GameState {
  return transition({ kind: 'exploring', checkpoint: { version: 1, position: { x: 5, y: 4 }, hp, completedEncounterIds: [] } }, { type: 'move', direction: 'right' });
}
it('entering an encounter blocks movement until battle ends', () => {
  const battle = encounter();
  expect(battle.kind).toBe('battle');
  expect(transition(battle, { type: 'move', direction: 'right' })).toEqual(battle);
});
it('victory heals and clears the encounter once', () => {
  const victory = transition(transition(encounter(), { type: 'attack' }), { type: 'attack' });
  expect(victory).toMatchObject({ kind: 'victory', checkpoint: { hp: 12, position: { x: 5, y: 4 }, completedEncounterIds: ['slime-1'] } });
  const exploring = transition(victory, { type: 'acknowledgeVictory' });
  expect(transition(exploring, { type: 'move', direction: 'right' })).toMatchObject({ kind: 'exploring', checkpoint: { position: { x: 6, y: 4 } } });
});
it('escape keeps the encounter available', () => {
  const escaped = transition(encounter(), { type: 'run' });
  expect(escaped).toMatchObject({ kind: 'exploring', checkpoint: { position: { x: 5, y: 4 }, completedEncounterIds: [] } });
  expect(transition(escaped, { type: 'move', direction: 'right' }).kind).toBe('battle');
});
it('defeat preserves checkpoint and restart creates a fresh game', () => {
  const defeat = transition(encounter(2), { type: 'attack' });
  expect(defeat).toMatchObject({ kind: 'defeat', checkpoint: { hp: 2 } });
  expect(transition(defeat, { type: 'restart' })).toEqual({ kind: 'exploring', checkpoint: { version: 1, position: { x: 2, y: 2 }, hp: 12, completedEncounterIds: [] } });
});
it('exploration updates position without mutating the old checkpoint', () => {
  const initial = transition(createSession(), { type: 'newGame' });
  expect(transition(initial, { type: 'move', direction: 'right' })).toMatchObject({ checkpoint: { position: { x: 3, y: 2 } } });
  expect(initial).toMatchObject({ checkpoint: { position: { x: 2, y: 2 } } });
});
