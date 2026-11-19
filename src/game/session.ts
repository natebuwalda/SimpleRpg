import type { Action, GameState } from './types';
import { createCheckpoint, getLivingEncounterAt, move } from './world';
import { deriveStats, isValidCharacter } from './character';
import type { RandomSource } from './dice';
import { createBattle, resolveTurn } from './battle';

export function createSession(): GameState { return { kind: 'title' }; }
export function transition(state: GameState, action: Action, rng: RandomSource = Math.random): GameState {
  if(action.type==='returnToRoster'&&['exploring','victory','defeat'].includes(state.kind))return {kind:'title'};
  if(action.type==='resumeDefeat'&&state.kind==='title')return {kind:'defeat',checkpoint:action.checkpoint};
  if (action.type === 'newGame' && state.kind === 'title' && isValidCharacter(action.character)) return { kind: 'exploring', checkpoint: createCheckpoint(action.world, action.character) };
  if (action.type === 'restart' && state.kind === 'defeat') return { kind: 'exploring', checkpoint: createCheckpoint(state.checkpoint.world, state.checkpoint.character) };
  if (action.type === 'continue' && state.kind === 'title') return { kind: 'exploring', checkpoint: action.checkpoint };
  if (action.type === 'move' && state.kind === 'exploring') {
    const position = move(state.checkpoint.world, state.checkpoint.position, action.direction);
    if (position === state.checkpoint.position) return state;
    const encounter = getLivingEncounterAt(state.checkpoint, position);
    if (encounter) {
      return { kind: 'battle', checkpoint: state.checkpoint, returnPosition: state.checkpoint.position, battle: createBattle(state.checkpoint.hp, state.checkpoint.character), encounterId: encounter.id };
    }
    return { kind: 'exploring', checkpoint: { ...state.checkpoint, position } };
  }
  if (state.kind === 'battle' && (action.type === 'attack' || action.type === 'run')) {
    const battle = resolveTurn(state.battle, action.type, rng);
    if (battle.result === 'escaped') return { kind: 'exploring', checkpoint: { ...state.checkpoint, position: state.returnPosition, hp: battle.heroHp } };
    if (battle.result === 'victory') return { kind: 'victory', lastTurn: battle.lastTurn, checkpoint: { ...state.checkpoint, position: state.returnPosition, hp: deriveStats(state.checkpoint.character).maxHp, completedEncounterIds: [...new Set([...state.checkpoint.completedEncounterIds, state.encounterId])] } };
    if (battle.result === 'defeat') return { kind: 'defeat', checkpoint: state.checkpoint, lastTurn: battle.lastTurn };
    return { ...state, battle };
  }
  if (state.kind === 'victory' && action.type === 'acknowledgeVictory') return { kind: 'exploring', checkpoint: state.checkpoint };
  return state;
}
