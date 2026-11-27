import type { BattleState, Character, Combatant, InitiativeResult, TurnRolls } from './types';
import { deriveStats } from './character';
import { getCombatPools, offenseFor, type CombatCommand } from './combat-actions';
import { rollOpposed, rollPool, type RandomSource } from './dice';
import { MAX_COMBAT_POOL } from './progression';
import { FIRST_SLIME_LEVEL, slimeStats } from './slime';

export function createBattle(heroHp: number, character: Character, slimeLevel = FIRST_SLIME_LEVEL, rng: RandomSource = Math.random): BattleState {
  const offense = offenseFor(character.classId);
  const enemy = slimeStats(slimeLevel);
  const rollInitiative = (combatant: Combatant, rawInitiative: number): InitiativeResult => ({
    combatant, rawInitiative, successes: rollPool(Math.min(rawInitiative, MAX_COMBAT_POOL), rng).successes,
  });
  const hero = rollInitiative('hero', deriveStats(character).initiative);
  const slime = rollInitiative('slime', enemy.initiative);
  const slimeGoesFirst = slime.successes > hero.successes
    || (slime.successes === hero.successes && slime.rawInitiative > hero.rawInitiative);
  return {
    offense, heroHp, slimeLevel, enemyHp: enemy.maxHp, heroPools: getCombatPools(character, offense),
    turnOrder: slimeGoesFirst ? [slime, hero] : [hero, slime], lastTurn: null, result: 'active',
  };
}

export function resolveTurn(state: BattleState, command: CombatCommand, rng: RandomSource = Math.random): BattleState {
  if (state.result !== 'active' || (command !== 'run' && command !== state.offense)) return state;
  const enemy = slimeStats(state.slimeLevel);
  const attacks: TurnRolls[number][] = [];
  let { heroHp, enemyHp } = state;
  let result: BattleState['result'] = 'active';
  for (const { combatant } of state.turnOrder) {
    if (combatant === 'hero') {
      if (command === 'run') {
        result = 'escaped';
        break;
      }
      const roll = rollOpposed(state.heroPools.attack, enemy.defense, rng);
      attacks.push({ attacker: 'hero', roll });
      enemyHp = Math.max(0, enemyHp - roll.damage);
      if (enemyHp === 0) {
        result = 'victory';
        break;
      }
    } else {
      const roll = rollOpposed(enemy.attack, state.heroPools.defense, rng);
      attacks.push({ attacker: 'slime', roll });
      heroHp = Math.max(0, heroHp - roll.damage);
      if (heroHp === 0) {
        result = 'defeat';
        break;
      }
    }
  }
  return { ...state, heroHp, enemyHp, lastTurn: attacks.length ? attacks : null, result };
}
