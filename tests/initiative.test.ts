import { expect, test, vi } from 'vitest';
import { createBattle, resolveTurn } from '../src/game/battle';
import { parseRoster } from '../src/game/save';
import { transition } from '../src/game/session';
import { makeCheckpoint } from './fixtures';
import { scriptedFaces } from './rolls';

const moveRight = { type: 'move', direction: 'right' } as const;
const miss = () => 0;

function atEncounter(hp = 5) {
  return { ...makeCheckpoint(), hp, position: { x: 14, y: 15 } };
}

function slimeFirst(hp = 5) {
  return createBattle(hp, makeCheckpoint().character, 1, scriptedFaces(1,1,1,1,1,1, 8,1,1));
}

test('successes outrank raw Initiative and an original 10 adds one bonus die', () => {
  const rng = vi.fn(scriptedFaces(10,1,1,1,1,1,10, 8,8,8));
  const battle = createBattle(5, makeCheckpoint().character, 1, rng);
  expect(battle.turnOrder).toEqual([
    { combatant: 'slime', rawInitiative: 3, successes: 3 },
    { combatant: 'hero', rawInitiative: 6, successes: 2 },
  ]);
  expect(rng).toHaveBeenCalledTimes(10);
  expect(battle.heroHp).toBe(5);
  expect(battle.lastTurn).toBeNull();
});

test('raw Initiative breaks ties, then the player wins exact ties', () => {
  const { character } = makeCheckpoint();
  expect(createBattle(5, character, 5, miss).turnOrder[0]).toEqual({ combatant: 'slime', rawInitiative: 7, successes: 0 });
  expect(createBattle(5, character, 4, miss).turnOrder[0]).toEqual({ combatant: 'hero', rawInitiative: 6, successes: 0 });
});

test('existing high-Cunning saves roll at most 1,024 player dice and keep the raw tiebreaker', () => {
  const checkpoint = atEncounter();
  checkpoint.slimeLevel = 1022;
  checkpoint.progression.level = 2001;
  checkpoint.progression.investments.attributes.cunning = 2000;
  const raw = JSON.stringify({ version: 12, slots: [{
    id: '00000000-0000-4000-8000-000000000001', revision: 1, status: 'active', checkpoint,
  }] });
  const saved = parseRoster(raw)?.slots[0].checkpoint;
  expect(saved).toEqual(checkpoint);
  const rng = vi.fn(miss);
  const state = transition({ kind: 'exploring', checkpoint: saved! }, moveRight, rng);
  expect(rng).toHaveBeenCalledTimes(2048);
  expect(state).toMatchObject({ kind: 'battle', battle: { turnOrder: [
    { combatant: 'hero', rawInitiative: 2006, successes: 0 },
    { combatant: 'slime', rawInitiative: 1024, successes: 0 },
  ] } });
});

test('initiative draws only on living encounter entry and rerolls when the player returns', () => {
  const checkpoint = atEncounter();
  const firstRng = vi.fn(miss);
  const entry = transition({ kind: 'exploring', checkpoint }, moveRight, firstRng);
  expect(firstRng).toHaveBeenCalledTimes(9);
  const escaped = transition(entry, { type: 'run' }, firstRng);
  expect(firstRng).toHaveBeenCalledTimes(9);
  const secondRng = vi.fn(scriptedFaces(1,1,1,1,1,1, 8,1,1));
  expect(transition(escaped, moveRight, secondRng)).toMatchObject({ kind: 'battle', battle: {
    turnOrder: [{ combatant: 'slime' }, { combatant: 'hero' }],
  } });
  expect(secondRng).toHaveBeenCalledTimes(9);
  const noEncounter = vi.fn(miss);
  transition({ kind: 'exploring', checkpoint: { ...checkpoint, completedEncounterIds: ['slime-1'] } }, moveRight, noEncounter);
  transition({ kind: 'exploring', checkpoint }, { type: 'move', direction: 'left' }, noEncounter);
  expect(noEncounter).not.toHaveBeenCalled();
});

test('attacks are logged in order and a defeated combatant never acts', () => {
  const battle = slimeFirst();
  const held = vi.fn(miss);
  expect(resolveTurn(battle, 'magic', held)).toBe(battle);
  expect(held).not.toHaveBeenCalled();
  const round = resolveTurn(battle, 'melee', miss);
  expect(round.turnOrder).toBe(battle.turnOrder);
  expect(round.lastTurn?.map(entry => entry.kind === 'attack' ? entry.attacker : entry.kind)).toEqual(['slime', 'hero']);
  expect(resolveTurn(slimeFirst(1), 'melee', scriptedFaces(8,1,1, 1,1,1,1))).toMatchObject({
    result: 'defeat', heroHp: 0, lastTurn: [{ attacker: 'slime', roll: { damage: 1 } }],
  });
  expect(resolveTurn(createBattle(5, makeCheckpoint().character, 1, miss), 'melee', scriptedFaces(8,8,8,1,1, 1,1,1))).toMatchObject({
    result: 'victory', enemyHp: 0, lastTurn: [{ attacker: 'hero', roll: { damage: 3 } }],
  });
});

test('slime-first Run carries damage out or saves a normal defeat if lethal', () => {
  const start = (hp: number) => transition({ kind: 'exploring', checkpoint: atEncounter(hp) }, moveRight, scriptedFaces(1,1,1,1,1,1, 8,1,1));
  const run = (hp: number) => transition(start(hp), { type: 'run' }, scriptedFaces(8,1,1, 1,1,1,1));
  expect(run(5)).toEqual({ kind: 'exploring', checkpoint: atEncounter(4) });
  const defeated = run(1);
  expect(defeated).toMatchObject({ kind: 'defeat', checkpoint: atEncounter(1), lastTurn: [{ attacker: 'slime' }] });
  expect(transition(defeated, { type: 'restart' })).toEqual({ kind: 'exploring', checkpoint: makeCheckpoint() });
});
