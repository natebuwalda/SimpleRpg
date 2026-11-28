import type { BattleClassAction, BattleState, Character, Combatant, InitiativeResult, TurnOrder, TurnRolls } from './types';
import { deriveStats } from './character';
import { CLASS_DEFINITIONS, getClericPool, getCombatPools, getNukeDamage, startingResources, type CombatCommand } from './combat-actions';
import { MAX_COMBAT_POOL, rollOpposed, rollPool, type RandomSource } from './dice';
import { FIRST_SLIME_LEVEL, slimeStats } from './slime';

function createClassAction(character: Character, stats: ReturnType<typeof deriveStats>, currentResources?: number): BattleClassAction {
  const maxResources = stats.resourceCapacity;
  switch (character.classId) {
    case 'warrior': return { kind: 'momentum', stacks: 0n, currentResources: 0, maxResources };
    case 'wizard': return { kind: 'nuke', damage: getNukeDamage(character), reservedResources: 0, currentResources: maxResources, maxResources };
    case 'rogue': return { kind: 'exploit', stacks: 0n, currentResources: Math.max(1, currentResources ?? 0), maxResources };
    case 'cleric': return {
      kind: 'cleric', pool: getClericPool(character), maxHp: stats.maxHp, maxResources,
      currentResources: currentResources ?? startingResources(maxResources),
    };
  }
}

function rankInitiative(hero: InitiativeResult, slime: InitiativeResult): TurnOrder {
  const slimeGoesFirst = slime.successes > hero.successes
    || (slime.successes === hero.successes && slime.rawInitiative > hero.rawInitiative);
  return slimeGoesFirst ? [slime, hero] : [hero, slime];
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
  return {
    offense, heroHp, slimeLevel, enemyHp: enemy.maxHp, heroPools: getCombatPools(character, offense),
    classAction: createClassAction(character, stats, currentResources),
    turnOrder: rankInitiative(hero, slime), lastTurn: null, result: 'active',
  };
}

export function combatCommandUnavailableReason(state: BattleState, command: CombatCommand, studyAmount?: number): string | null {
  if (state.result !== 'active') return 'The encounter has ended.';
  if (command === 'run' || command === state.offense) return null;
  const action = state.classAction;
  const { currentResources, maxResources } = action;
  if (action.kind === 'momentum') {
    if (command === 'momentum') return action.stacks <= BigInt(currentResources) ? null : 'Momentum costs one Resource per current stack.';
    if (command === 'execute') return state.enemyHp < currentResources ? null : 'Execute requires less target Health than your current Resources.';
  }
  if (action.kind === 'exploit') {
    if (command === 'prepare') return currentResources > 0 ? null : 'Prepare requires one Resource.';
    if (command === 'exploit') {
      if (state.turnOrder[0].combatant !== 'hero') return 'Exploit requires acting before the target.';
      return action.stacks > 0n ? null : 'Exploit requires at least one stack.';
    }
  }
  if (action.kind === 'nuke') {
    if (command === 'nuke') return currentResources > 0 ? null : 'Nuke requires one available Resource.';
    if (command === 'study') {
      if (action.reservedResources > 0) return null;
      if (currentResources === 0) return 'Study requires an available Resource.';
      return typeof studyAmount === 'number' && Number.isSafeInteger(studyAmount) && studyAmount >= 1 && studyAmount <= currentResources
        ? null : 'Enter a whole number within your available Resources.';
    }
  }
  if (action.kind === 'cleric') {
    if (command === 'heal') return currentResources > 0 ? null : 'Heal requires at least one Resource.';
    if (command === 'smite') return currentResources < maxResources ? null : 'Resources are full.';
  }
  return 'This action is unavailable for your class.';
}

export function canUseCombatCommand(state: BattleState, command: CombatCommand, studyAmount?: number): boolean {
  return combatCommandUnavailableReason(state, command, studyAmount) === null;
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

export function resolveTurn(state: BattleState, command: CombatCommand, rng: RandomSource = Math.random, studyAmount?: number): BattleState {
  if (!canUseCombatCommand(state, command, studyAmount)) return state;
  const enemy = slimeStats(state.slimeLevel);
  const rolls: TurnRolls[number][] = [];
  const { heroPools } = state;
  let { heroHp, enemyHp, classAction, turnOrder } = state;
  let result: BattleState['result'] = 'active';
  for (const { combatant } of state.turnOrder) {
    if (combatant === 'hero') {
      if (command === 'run') {
        result = 'escaped';
        break;
      }
      if (command === 'execute') {
        enemyHp = 0;
        rolls.push({ kind: 'execute' });
      } else if (command === 'momentum' && classAction.kind === 'momentum') {
        const cost = Number(classAction.stacks);
        classAction = { ...classAction, stacks: classAction.stacks + 1n, currentResources: classAction.currentResources - cost };
        rolls.push({ kind: 'momentum', stacks: classAction.stacks, currentResources: classAction.currentResources, cost });
      } else if (command === 'exploit' && classAction.kind === 'exploit') {
        const { stacks, currentResources, maxResources } = classAction;
        const space = BigInt(maxResources - currentResources);
        const resourceGain = Number(stacks < space ? stacks : space);
        const damage = currentResources + resourceGain;
        classAction = { ...classAction, stacks: 0n, currentResources: damage };
        enemyHp = Math.max(0, enemyHp - damage);
        rolls.push({ kind: 'exploit', damage, stacks, resourceGain, currentResources: damage });
      } else if (command === 'prepare' && classAction.kind === 'exploit') {
        const [first, second] = state.turnOrder;
        const [hero, slime] = first.combatant === 'hero' ? [first, second] : [second, first];
        const successes = hero.successes + 1;
        turnOrder = rankInitiative({ ...hero, successes }, slime);
        classAction = { ...classAction, currentResources: classAction.currentResources - 1 };
        rolls.push({ kind: 'prepare', successes, currentResources: classAction.currentResources });
      } else if (command === 'study' && classAction.kind === 'nuke') {
        const released = classAction.reservedResources;
        const reservedResources = released > 0 ? 0 : studyAmount!;
        classAction = { ...classAction, reservedResources, currentResources: classAction.currentResources + released - reservedResources };
        rolls.push({ kind: 'study', reservedResources, released, currentResources: classAction.currentResources });
      } else if (command === 'nuke' && classAction.kind === 'nuke') {
        const baseDamage = classAction.damage;
        const defense = rollPool(enemy.defense, rng);
        const damage = Math.max(0, baseDamage - defense.successes);
        enemyHp = Math.max(0, enemyHp - damage);
        classAction = { ...classAction, currentResources: classAction.currentResources - 1 };
        rolls.push({ kind: 'nuke', baseDamage, defense, damage, currentResources: classAction.currentResources });
      } else if ((command === 'heal' || command === 'smite') && classAction.kind === 'cleric') {
        const roll = rollPool(classAction.pool, rng);
        const { currentResources, maxResources, maxHp } = classAction;
        const amount = command === 'heal'
          ? Math.min(roll.successes, currentResources, maxHp - heroHp)
          : Math.min(roll.successes, maxResources - currentResources);
        if (command === 'heal') heroHp += amount;
        else enemyHp = Math.max(0, enemyHp - amount);
        classAction = { ...classAction, currentResources: currentResources + (command === 'heal' ? -1 : 1) };
        rolls.push({ kind: command, roll, amount, currentResources: classAction.currentResources });
      } else {
        const roll = rollOpposed(getBattlePools({ heroPools, classAction }).attack, enemy.defense, rng);
        const resourceGain = classAction.kind === 'momentum' && classAction.currentResources < classAction.maxResources ? 1 : 0;
        const stacksAdded = classAction.kind === 'exploit' ? 1 : 0;
        if (resourceGain) classAction = { ...classAction, currentResources: classAction.currentResources + resourceGain };
        if (classAction.kind === 'exploit') classAction = { ...classAction, stacks: classAction.stacks + 1n };
        rolls.push({ kind: 'attack', attacker: 'hero', roll, resourceGain, stacksAdded });
        enemyHp = Math.max(0, enemyHp - roll.damage);
      }
      if (enemyHp === 0) {
        result = 'victory';
        break;
      }
    } else {
      const roll = rollOpposed(enemy.attack, getBattlePools({ heroPools, classAction }).defense, rng);
      const absorbed = classAction.kind === 'nuke' ? Math.min(roll.damage, classAction.reservedResources) : 0;
      const damage = roll.damage - absorbed;
      const resourceGain = damage > 0 && classAction.kind === 'momentum' && classAction.currentResources < classAction.maxResources ? 1 : 0;
      if (resourceGain) classAction = { ...classAction, currentResources: classAction.currentResources + resourceGain };
      rolls.push({ kind: 'attack', attacker: 'slime', roll, absorbed, resourceGain });
      heroHp = Math.max(0, heroHp - damage);
      if (heroHp === 0) {
        result = 'defeat';
        break;
      }
    }
  }
  if (result !== 'active') {
    if (classAction.kind === 'momentum') classAction = { ...classAction, stacks: 0n, currentResources: 0 };
    if (classAction.kind === 'exploit') classAction = { ...classAction, stacks: 0n };
    if (classAction.kind === 'nuke') classAction = { ...classAction, reservedResources: 0 };
  }
  return { ...state, heroHp, enemyHp, classAction, turnOrder, lastTurn: rolls.length ? rolls : null, result };
}
