import { expect, it } from 'vitest';
import { createSession, transition } from '../src/game/session';
import type { GameState } from '../src/game/types';
import { makeCheckpoint, makeWorld } from './fixtures';

const world = makeWorld();

it('new game starts exploration', () => {
  expect(transition(createSession(), { type: 'newGame', world })).toEqual({
    kind: 'exploring', checkpoint: makeCheckpoint(world),
  });
});

function encounter(hp = 5): GameState {
  return transition({ kind: 'exploring', checkpoint: { ...makeCheckpoint(world), position: { x: 14, y: 15 }, hp } }, { type: 'move', direction: 'right' });
}
it('entering an encounter blocks movement until battle ends', () => {
  const battle = encounter();
  expect(battle.kind).toBe('battle');
  expect(transition(battle, { type: 'move', direction: 'right' })).toEqual(battle);
});
it('victory heals and clears the encounter once', () => {
  const victory = transition(transition(encounter(), { type: 'attack' }), { type: 'attack' });
  expect(victory).toMatchObject({ kind: 'victory', checkpoint: { hp: 5, position: { x: 14, y: 15 }, completedEncounterIds: ['slime-1'] } });
  const exploring = transition(victory, { type: 'acknowledgeVictory' });
  expect(transition(exploring, { type: 'move', direction: 'right' })).toMatchObject({ kind: 'exploring', checkpoint: { position: { x: 15, y: 15 } } });
});
it('escape keeps the encounter available', () => {
  const escaped = transition(encounter(), { type: 'run' });
  expect(escaped).toMatchObject({ kind: 'exploring', checkpoint: { position: { x: 14, y: 15 }, completedEncounterIds: [] } });
  expect(transition(escaped, { type: 'move', direction: 'right' }).kind).toBe('battle');
});
it('defeat preserves checkpoint and restart creates a fresh game', () => {
  const defeat = transition(encounter(2), { type: 'attack' });
  expect(defeat).toMatchObject({ kind: 'defeat', checkpoint: { hp: 2 } });
  expect(transition(defeat, { type: 'restart' })).toEqual({ kind: 'exploring', checkpoint: makeCheckpoint(world) });
});
it('exploration updates position without mutating the old checkpoint', () => {
  const initial = transition(createSession(), { type: 'newGame', world });
  expect(transition(initial, { type: 'move', direction: 'right' })).toMatchObject({ checkpoint: { position: { x: 4, y: 3 } } });
  expect(initial).toMatchObject({ checkpoint: { position: { x: 3, y: 3 } } });
});

it('restart preserves a rectangular world definition', () => {
 const checkpoint = {...makeCheckpoint(makeWorld(40,30)),position:{x:35,y:24},hp:2};
 const defeat:GameState = {kind:'defeat',checkpoint};
 expect(transition(defeat,{type:'restart'})).toEqual({kind:'exploring',checkpoint:{...checkpoint,position:{x:3,y:3},hp:5}});
});
