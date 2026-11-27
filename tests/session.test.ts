import { expect, it } from 'vitest';
import { createSession, transition as reduce } from '../src/game/session';
import type { GameState } from '../src/game/types';
import { makeCheckpoint, makeWorld } from './fixtures';

import { scriptedFaces, losingFaces } from './rolls';
const transition: typeof reduce = (state, action, rng = () => .7) => reduce(state, action, rng);
const world = makeWorld();

it('new game starts exploration', () => {
  expect(transition(createSession(), { type: 'newGame', world, character: makeCheckpoint().character })).toEqual({
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
  const victory = transition(transition(encounter(2), { type: 'melee' }), { type: 'melee' });
  expect(victory).toMatchObject({ kind: 'victory', checkpoint: { hp: 5, position: { x: 14, y: 15 }, completedEncounterIds: ['slime-1'] } });
  expect(victory).toMatchObject({ lastTurn: [{ attacker: 'hero', roll: { damage: 2 } }] });
  if (victory.kind !== 'victory') throw Error('Expected victory');
  expect(victory.checkpoint).not.toHaveProperty('lastTurn');
  const exploring = transition(victory, { type: 'acknowledgeVictory' });
  expect(transition(exploring, { type: 'move', direction: 'right' })).toMatchObject({ kind: 'exploring', checkpoint: { position: { x: 15, y: 15 } } });
});
it('escape keeps the encounter available', () => {
  const escaped = transition(encounter(), { type: 'run' });
  expect(escaped).toMatchObject({ kind: 'exploring', checkpoint: { position: { x: 14, y: 15 }, completedEncounterIds: [] } });
  expect(transition(escaped, { type: 'move', direction: 'right' }).kind).toBe('battle');
});
it('defeat preserves checkpoint and restart creates a fresh game', () => {
  const defeat = transition(encounter(2), { type: 'melee' }, scriptedFaces(...losingFaces));
  expect(defeat).toMatchObject({ kind: 'defeat', checkpoint: { hp: 2 } });
  expect(transition(defeat, { type: 'restart' })).toEqual({ kind: 'exploring', checkpoint: makeCheckpoint(world) });
});
it('exploration updates position without mutating the old checkpoint', () => {
  const initial = transition(createSession(), { type: 'newGame', world, character: makeCheckpoint().character });
  expect(transition(initial, { type: 'move', direction: 'right' })).toMatchObject({ checkpoint: { position: { x: 4, y: 3 } } });
  expect(initial).toMatchObject({ checkpoint: { position: { x: 3, y: 3 } } });
});

it('restart preserves a rectangular world definition', () => {
 const checkpoint = {...makeCheckpoint(makeWorld(40,30)),position:{x:35,y:24},hp:2};
 const defeat:GameState = {kind:'defeat',checkpoint};
 expect(transition(defeat,{type:'restart'})).toEqual({kind:'exploring',checkpoint:{...checkpoint,position:{x:3,y:3},hp:5}});
});
it('roster return and persisted defeat preserve checkpoints without a battle exit',()=>{
 const title=createSession(),cp=makeCheckpoint();
 expect(transition(title,{type:'resumeDefeat',checkpoint:cp})).toEqual({kind:'defeat',checkpoint:cp});
 for(const kind of ['exploring','victory','defeat'] as const)expect(transition({kind,checkpoint:cp,xpAwarded:1},{type:'returnToRoster'})).toEqual(title);
 const battle=encounter();expect(transition(battle,{type:'returnToRoster'})).toEqual(battle);
});
