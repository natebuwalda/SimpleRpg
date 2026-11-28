import { isCombatCommand } from './combat-actions';
import type { Action, GameState } from './types';
import { createCheckpoint, getLivingEncounterAt, move, restartCheckpoint } from './world';
import { deriveStats, isValidCharacter } from './character';
import type { RandomSource } from './dice';
import { createBattle, resolveTurn } from './battle';
import { creditXp, effectiveCharacter } from './progression';
import { slimeStats } from './slime';

export function createSession(): GameState { return { kind: 'title' }; }
export function transition(state: GameState, action: Action, rng: RandomSource = Math.random): GameState {
  if(action.type==='returnToRoster'&&['exploring','victory','defeat'].includes(state.kind))return {kind:'title'};
  if(action.type==='resumeDefeat'&&state.kind==='title')return {kind:'defeat',checkpoint:action.checkpoint};
  if (action.type === 'newGame' && state.kind === 'title' && isValidCharacter(action.character)) return { kind: 'exploring', checkpoint: createCheckpoint(action.world, action.character) };
  if (action.type === 'restart' && state.kind === 'defeat') return { kind: 'exploring', checkpoint: restartCheckpoint(state.checkpoint) };
  if (action.type === 'continue' && state.kind === 'title') return { kind: 'exploring', checkpoint: action.checkpoint };
  if (action.type === 'move' && state.kind === 'exploring') {
    const position = move(state.checkpoint.world, state.checkpoint.position, action.direction);
    if (position === state.checkpoint.position) return state;
    const encounter = getLivingEncounterAt(state.checkpoint, position);
    if (encounter) {
      const hero = effectiveCharacter(state.checkpoint.character, state.checkpoint.progression);
      return { kind: 'battle', checkpoint: state.checkpoint, returnPosition: state.checkpoint.position, battle: createBattle(state.checkpoint.hp, hero, state.checkpoint.slimeLevel, rng, state.checkpoint.currentResources), encounterId: encounter.id };
    }
    return { kind: 'exploring', checkpoint: { ...state.checkpoint, position } };
  }
  if (state.kind === 'battle' && isCombatCommand(action.type)) {
    const battle = resolveTurn(state.battle, action.type, rng, action.type === 'study' ? action.amount : undefined);
    if (battle === state.battle) return state;
    const resources = battle.classAction.kind === 'cleric' || battle.classAction.kind === 'exploit'
      ? { currentResources: battle.classAction.currentResources } : {};
    if (battle.result === 'escaped') return { kind: 'exploring', checkpoint: { ...state.checkpoint, ...resources, position: state.returnPosition, hp: battle.heroHp } };
    if (battle.result === 'victory') {
      const { checkpoint } = state;
      const completed = checkpoint.completedEncounterIds.includes(state.encounterId);
      const { progression, creditedXp } = creditXp(checkpoint.progression, completed ? 0 : slimeStats(battle.slimeLevel).xp);
      return {
        kind: 'victory', lastTurn: battle.lastTurn, xpAwarded: creditedXp, levelGained: progression.level > checkpoint.progression.level,
        checkpoint: {
          ...checkpoint, ...resources, progression, position: state.returnPosition,
          hp: deriveStats(effectiveCharacter(checkpoint.character, progression)).maxHp,
          completedEncounterIds: completed ? checkpoint.completedEncounterIds : [...checkpoint.completedEncounterIds, state.encounterId],
        },
      };
    }
    if (battle.result === 'defeat') return { kind: 'defeat', checkpoint: state.checkpoint, lastTurn: battle.lastTurn };
    return { ...state, battle };
  }
  if (state.kind === 'victory' && action.type === 'acknowledgeVictory') return { kind: 'exploring', checkpoint: state.checkpoint };
  return state;
}
