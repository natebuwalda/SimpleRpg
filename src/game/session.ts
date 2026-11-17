import type { Action, GameState } from './types';
import { atEncounter, createCheckpoint, move } from './world';

export function createSession(): GameState { return { kind: 'title' }; }
export function transition(state: GameState, action: Action): GameState {
  if (action.type === 'newGame' || action.type === 'restart') return { kind: 'exploring', checkpoint: createCheckpoint() };
  if (action.type === 'continue' && state.kind === 'title') return { kind: 'exploring', checkpoint: action.checkpoint };
  if (action.type === 'move' && state.kind === 'exploring') {
    const position = move(state.checkpoint.position, action.direction);
    if (atEncounter(position)) return state;
    return { kind: 'exploring', checkpoint: { ...state.checkpoint, position } };
  }
  return state;
}
