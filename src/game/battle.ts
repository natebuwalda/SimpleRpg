import type { BattleClassAction, BattleState, Character, Combatant, InitiativeResult, TurnRolls } from './types';
import { deriveStats } from './character';
import { CLASS_DEFINITIONS, getClericPool, getCombatPools, getExploitPool, getNukeDamage, startingResources, type CombatCommand } from './combat-actions';
import { MAX_COMBAT_POOL, rollOpposed, rollPool, type RandomSource } from './dice';
import { FIRST_SLIME_LEVEL, slimeStats } from './slime';

function createClassAction(character: Character, stats: ReturnType<typeof deriveStats>, currentResources?: number): BattleClassAction {
  switch (character.classId) {
    case 'warrior': return { kind: 'momentum', stacks: 0n };
    case 'wizard': return { kind: 'nuke', damage: getNukeDamage(character) };
    case 'rogue': return { kind: 'exploit', pool: getExploitPool(character), stacks: 0n };
    case 'cleric': return {
      kind: 'cleric', pool: getClericPool(character), maxHp: stats.maxHp, maxResources: stats.resourceCapacity,
      currentResources: currentResources ?? startingResources(stats.resourceCapacity),
    };
  }
}

export function createBattle(heroHp: number, character: Character, slimeLevel = FIRST_SLIME_LEVEL, rng: RandomSource = Math.random, currentResources?: number): BattleState {
  const { offense } = CLASS_DEFINITIONS[character.classId];
  const enemy = slimeStats(slimeLevel);
  const rollInitiative = (combatant: Combatant, rawInitiative: number): InitiativeResult => ({
    combatant, rawInitiative, successes: rollPool(Math.min(rawInitiative, MAX_COMBAT_POOL), rng).successes,
  });
  const stats = deriveStats(character);
  const hero = rollInitiative('hero', stats.initiative);
  const slime = rollInitiative('slime', enemy.initiative);
  const slimeGoesFirst = slime.successes > hero.successes
    || (slime.successes === hero.successes && slime.rawInitiative > hero.rawInitiative);
  return {
    offense, heroHp, slimeLevel, enemyHp: enemy.maxHp, heroPools: getCombatPools(character, offense),
    classAction: createClassAction(character, stats, currentResources),
    turnOrder: slimeGoesFirst ? [slime, hero] : [hero, slime], lastTurn: null, result: 'active',
  };
}

export function canUseCombatCommand(state: BattleState, command: CombatCommand): boolean {
  if (state.result !== 'active') return false;
  if (command === 'run' || command === state.offense) return true;
  if (state.classAction.kind === 'cleric') {
    if (command === 'heal') return state.classAction.currentResources > 0;
    if (command === 'smite') return state.classAction.currentResources < state.classAction.maxResources;
    return false;
  }
  return command === state.classAction.kind && (command !== 'exploit' || state.turnOrder[0].combatant === 'hero');
}

export function getBattlePools({ heroPools, classAction }: Pick<BattleState, 'heroPools' | 'classAction'>): BattleState['heroPools'] {
  if (classAction.kind !== 'momentum') return heroPools;
  const ceiling = BigInt(MAX_COMBAT_POOL);
  const bonus = Number(classAction.stacks < ceiling ? classAction.stacks : ceiling);
  return {
    attack: Math.min(heroPools.attack + bonus, MAX_COMBAT_POOL),
    defense: Math.min(heroPools.defense + bonus, MAX_COMBAT_POOL),
  };
}

export function resolveTurn(state: BattleState, command: CombatCommand, rng: RandomSource = Math.random): BattleState {
  if (!canUseCombatCommand(state, command)) return state;
  const enemy = slimeStats(state.slimeLevel);
  const rolls: TurnRolls[number][] = [];
  const { heroPools } = state;
  let { heroHp, enemyHp, classAction } = state;
  let result: BattleState['result'] = 'active';
  for (const { combatant } of state.turnOrder) {
    if (combatant === 'hero') {
      if (command === 'run') {
        result = 'escaped';
        break;
      }
      if (command === 'exploit' && classAction.kind === 'exploit') {
        const roll = rollPool(classAction.pool, rng);
        classAction = { ...classAction, stacks: classAction.stacks + BigInt(roll.successes) };
        rolls.push({ kind: 'exploit', roll });
        continue;
      }
      if (command === 'momentum' && classAction.kind === 'momentum') {
        classAction = { kind: 'momentum', stacks: classAction.stacks + 1n };
        rolls.push(classAction);
        continue;
      }
      if ((command === 'heal' || command === 'smite') && classAction.kind === 'cleric') {
        const roll = rollPool(classAction.pool, rng);
        const { currentResources, maxResources, maxHp } = classAction;
        const amount = command === 'heal'
          ? Math.min(roll.successes, currentResources, maxHp - heroHp)
          : Math.min(roll.successes, maxResources - currentResources);
        if (command === 'heal') heroHp += amount;
        else enemyHp = Math.max(0, enemyHp - amount);
        classAction = { ...classAction, currentResources: currentResources + (command === 'heal' ? -1 : 1) };
        rolls.push({ kind: command, roll, amount, currentResources: classAction.currentResources });
      } else if (command === 'nuke' && classAction.kind === 'nuke') {
        enemyHp = Math.max(0, enemyHp - classAction.damage);
        rolls.push(classAction);
      } else {
        const roll = rollOpposed(getBattlePools({ heroPools, classAction }).attack, enemy.defense, rng);
        const exploitBonus = classAction.kind === 'exploit' && roll.damage > 0 ? classAction.stacks : 0n;
        if (classAction.kind === 'exploit' && exploitBonus > 0n) classAction = { ...classAction, stacks: 0n };
        rolls.push({ kind: 'attack', attacker: 'hero', roll, exploitBonus });
        const damage = BigInt(roll.damage) + exploitBonus;
        enemyHp = damage >= BigInt(enemyHp) ? 0 : enemyHp - Number(damage);
      }
      if (enemyHp === 0) {
        result = 'victory';
        break;
      }
    } else {
      const roll = rollOpposed(enemy.attack, getBattlePools({ heroPools, classAction }).defense, rng);
      rolls.push({ kind: 'attack', attacker: 'slime', roll, exploitBonus: 0n });
      heroHp = Math.max(0, heroHp - roll.damage);
      if (heroHp === 0) {
        result = 'defeat';
        break;
      }
    }
  }
  if (result !== 'active' && 'stacks' in classAction) classAction = { ...classAction, stacks: 0n };
  return { ...state, heroHp, enemyHp, classAction, lastTurn: rolls.length ? rolls : null, result };
}
