import { expect, test, vi } from 'vitest';
import { canUseCombatCommand, createBattle, resolveTurn } from '../src/game/battle';
import { transition } from '../src/game/session';
import { makeCheckpoint } from './fixtures';
import { scriptedFaces } from './rolls';

const rogue = { ...makeCheckpoint().character, classId: 'rogue' as const };
const miss = () => 0;

test('Exploit requires a first-acting Rogue and at least one stack', () => {
  const late = createBattle(5, rogue, 1, scriptedFaces(1,1,1,1,1,1, 8,1,1));
  const rng = vi.fn(miss);
  for (const state of [
    createBattle(5, makeCheckpoint().character, 1, miss),
    createBattle(5, rogue, 1, miss),
    resolveTurn(late, 'melee', miss),
  ]) {
    expect(canUseCombatCommand(state, 'exploit')).toBe(false);
    expect(resolveTurn(state, 'exploit', rng)).toBe(state);
  }
  expect(rng).not.toHaveBeenCalled();
});

test('large stacks convert exactly and saturate the balance without consuming it', () => {
  const battle = createBattle(5, rogue, 1, miss, 2);
  if (battle.classAction.kind !== 'exploit') throw Error('Expected Rogue state');
  const stacks = 9_007_199_254_740_993n;
  const round = resolveTurn({ ...battle, classAction: { ...battle.classAction, stacks } }, 'exploit', () => {
    throw Error('Lethal Exploit must not roll');
  });
  expect(round).toMatchObject({ result: 'victory', classAction: { stacks: 0n, currentResources: 5 }, lastTurn: [
    { kind: 'exploit', stacks, resourceGain: 3, damage: 5 },
  ] });
});

test('escape clears target stacks, while the Rogue keeps their current Resources', () => {
  const step = { type: 'move', direction: 'right' } as const;
  const checkpoint = { ...makeCheckpoint(), character: rogue, currentResources: 2, position: { x: 14, y: 15 } };
  const battle = transition({ kind: 'exploring', checkpoint }, step, miss);
  const stacked = transition(battle, { type: 'melee' }, miss);
  expect(stacked).toMatchObject({ battle: { classAction: { stacks: 1n } } });
  const escaped = transition(stacked, { type: 'run' }, miss);
  expect(escaped).toEqual({ kind: 'exploring', checkpoint });
  expect(transition(escaped, step, miss)).toMatchObject({ battle: { classAction: { stacks: 0n, currentResources: 2 } } });
});
