import type { Action, GameState } from './types';
import { atEncounter, createCheckpoint, ENCOUNTER_ID, MAX_HP, move } from './world';
import { createBattle, resolveTurn } from './battle';

export function createSession(): GameState { return { kind: 'title' }; }
export function transition(state: GameState, action: Action): GameState {
  if (action.type === 'newGame' && state.kind === 'title') return { kind: 'exploring', checkpoint: createCheckpoint(action.world) };
  if (action.type === 'restart' && state.kind === 'defeat') return { kind: 'exploring', checkpoint: createCheckpoint(state.checkpoint.world) };
  if (action.type === 'continue' && state.kind === 'title') return { kind: 'exploring', checkpoint: action.checkpoint };
  if (action.type === 'move' && state.kind === 'exploring') {
    const position = move(state.checkpoint.world, state.checkpoint.position, action.direction);
    if (position === state.checkpoint.position) return state;
    if (atEncounter(state.checkpoint.world, position) && !state.checkpoint.completedEncounterIds.includes(ENCOUNTER_ID)) {
      return { kind: 'battle', checkpoint: state.checkpoint, returnPosition: state.checkpoint.position, battle: createBattle(state.checkpoint.hp) };
    }
    return { kind: 'exploring', checkpoint: { ...state.checkpoint, position } };
  }
  if (state.kind === 'battle' && (action.type === 'attack' || action.type === 'run')) {
    const battle = resolveTurn(state.battle, action.type);
    if (battle.result === 'escaped') return { kind: 'exploring', checkpoint: { ...state.checkpoint, position: state.returnPosition, hp: battle.heroHp } };
    if (battle.result === 'victory') return { kind: 'victory', checkpoint: { ...state.checkpoint, position: state.returnPosition, hp: MAX_HP, completedEncounterIds: [...new Set([...state.checkpoint.completedEncounterIds, ENCOUNTER_ID])] } };
    if (battle.result === 'defeat') return { kind: 'defeat', checkpoint: state.checkpoint };
    return { ...state, battle };
  }
  if (state.kind === 'victory' && action.type === 'acknowledgeVictory') return { kind: 'exploring', checkpoint: state.checkpoint };
  return state;
}
