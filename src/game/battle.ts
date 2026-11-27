import type { BattleState, Character, Combatant, InitiativeResult, TurnRolls } from './types';
import { deriveStats } from './character';
import { getCombatPools, getExploitPool, offenseFor, type CombatCommand } from './combat-actions';
import { MAX_COMBAT_POOL, rollOpposed, rollPool, type RandomSource } from './dice';
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
    exploit: character.classId === 'rogue' ? { pool: getExploitPool(character), stacks: 0n } : null,
    turnOrder: slimeGoesFirst ? [slime, hero] : [hero, slime], lastTurn: null, result: 'active',
  };
}

export function canExploit(state: BattleState): boolean {
  return state.result === 'active' && state.exploit !== null && state.turnOrder[0].combatant === 'hero';
}

export function resolveTurn(state: BattleState, command: CombatCommand, rng: RandomSource = Math.random): BattleState {
  if (state.result !== 'active') return state;
  if (command === 'exploit' ? !canExploit(state) : command !== 'run' && command !== state.offense) return state;
  const enemy = slimeStats(state.slimeLevel);
  const rolls: TurnRolls[number][] = [];
  let { heroHp, enemyHp, exploit } = state;
  let result: BattleState['result'] = 'active';
  for (const { combatant } of state.turnOrder) {
    if (combatant === 'hero') {
      if (command === 'run') {
        result = 'escaped';
        break;
      }
      if (command === 'exploit' && exploit) {
        const roll = rollPool(exploit.pool, rng);
        exploit = { ...exploit, stacks: exploit.stacks + BigInt(roll.successes) };
        rolls.push({ kind: 'exploit', roll });
        continue;
      }
      const roll = rollOpposed(state.heroPools.attack, enemy.defense, rng);
      const exploitBonus = roll.damage > 0 ? exploit?.stacks ?? 0n : 0n;
      if (exploit && exploitBonus > 0n) exploit = { ...exploit, stacks: 0n };
      rolls.push({ kind: 'attack', attacker: 'hero', roll, exploitBonus });
      const damage = BigInt(roll.damage) + exploitBonus;
      enemyHp = damage >= BigInt(enemyHp) ? 0 : enemyHp - Number(damage);
      if (enemyHp === 0) {
        result = 'victory';
        break;
      }
    } else {
      const roll = rollOpposed(enemy.attack, state.heroPools.defense, rng);
      rolls.push({ kind: 'attack', attacker: 'slime', roll, exploitBonus: 0n });
      heroHp = Math.max(0, heroHp - roll.damage);
      if (heroHp === 0) {
        result = 'defeat';
        break;
      }
    }
  }
  if (exploit && result !== 'active') exploit = { ...exploit, stacks: 0n };
  return { ...state, heroHp, enemyHp, exploit, lastTurn: rolls.length ? rolls : null, result };
}
