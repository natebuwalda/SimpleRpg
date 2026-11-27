import type { UiAction, Character, Checkpoint, Direction, GameState, TurnOrder, TurnRolls } from '../game/types';
import { deriveStats } from '../game/character';
import { CLASS_DEFINITIONS, OFFENSIVE_ACTIONS, getCombatPools, offenseFor } from '../game/combat-actions';
import type { PoolRoll } from '../game/dice';
import { slimeStats } from '../game/slime';
import { canFindMoreSlimes, getRemainingSlimeCount } from '../game/world';
import { mountCharacterCreation } from './character-creation';
import {mountRoster} from './roster';
import {mountConfirmation} from './confirmation';
import type {RosterObservation} from '../game/roster';
import {availablePoints,effectiveCharacter,hasSupportedCombatPools,progressionSummary,spendPoint,type Rating} from '../game/progression';

export interface Ui {
  render(state: GameState, saveStatus: string, unsavedProgress?:boolean, canSave?:boolean): void;
  isConfirming():boolean;
  onAction(handler: (action: UiAction) => void): void;
  setBusy(busy: boolean): void;
  setRoster(observation:RosterObservation,canMutate:boolean):void;
  setCreationPending(pending:boolean):void;
  showCreationMessage(message:string):void;
  showRosterMessage(message:string):void;
  confirmDiscard():void;
  completeCreation():void;
}

const advancementRatings = [
  {group:'attributes',key:'prowess'}, {group:'attributes',key:'cunning'}, {group:'attributes',key:'resistance'},
  {group:'skills',key:'combat'}, {group:'skills',key:'subterfuge'}, {group:'skills',key:'lore'},
] as const satisfies readonly Rating[];

function characterDetails(checkpoint: Checkpoint, canSpend: boolean, open: boolean): string {
  const { progression } = checkpoint;
  const character = effectiveCharacter(checkpoint.character, progression);
  const a = character.attributes, s = character.skills, stats = deriveStats(character), offense = offenseFor(character.classId), pools = getCombatPools(character, offense);
  const points = availablePoints(progression);
  const controls = canSpend && points > 0 ? `<div class="advancement-controls">${advancementRatings.map(rating => {
    const {key} = rating;
    const supported = hasSupportedCombatPools(effectiveCharacter(checkpoint.character, spendPoint(progression, rating)));
    return `<button type="button" data-rating="${key}" ${supported?'':'disabled'}>Raise ${key[0].toUpperCase()+key.slice(1)}</button>`;
  }).join('')}</div>` : '';
  return `<details class="game-details" data-character-sheet ${open ? 'open' : ''}><summary>Character</summary><div class="detail-content">
    <p aria-label="Character name"></p>
    <p aria-label="Character progression">${progressionSummary(progression)}</p>
    <p aria-label="Character attributes">Prowess ${a.prowess} · Cunning ${a.cunning} · Resistance ${a.resistance}</p>
    <p aria-label="Character skills">Combat ${s.combat} · Subterfuge ${s.subterfuge} · Lore ${s.lore}</p>
    <p aria-label="Derived stats">Health ${stats.maxHp} · Initiative ${stats.initiative} · Resource capacity ${stats.resourceCapacity}</p>
    <p aria-label="Character class">${CLASS_DEFINITIONS[character.classId].label}</p>
    <p aria-label="Combat pools">${OFFENSIVE_ACTIONS[offense].label} ${pools.attack}d10 · Defense ${pools.defense}d10</p>${controls}</div></details>`;
}
function diceText(label: string, roll: PoolRoll): string {
  return `<p aria-label="${label}"><strong>${label}</strong><br>Original: ${roll.original.join(', ')}. Bonus: ${roll.bonus.join(', ') || 'none'}. Successes: ${roll.successes}.</p>`;
}
function rollDetails(turn: TurnRolls | null | undefined): string {
  if (!turn) return '';
  return `<details class="game-details"><summary>Roll details</summary><div class="detail-content">
    ${turn.map(({ attacker, roll }) => attacker === 'hero'
      ? diceText('Your attack dice', roll.attack) + diceText('Slime defense dice', roll.defense)
      : diceText('Slime attack dice', roll.attack) + diceText('Your defense dice', roll.defense)).join('')}
    ${turn.length === 1 && turn[0].attacker === 'hero' ? '<p>No counterattack.</p>' : ''}
    <p>8–10 succeeds. Each original 10 adds one bonus die; bonus dice never add another. Ties favor the defender.</p></div></details>`;
}
function turnSummary(turn: TurnRolls, separator = '<br>'): string {
  return turn.map(({ attacker, roll }) =>
    `${attacker === 'hero' ? 'You' : 'Slime'}: ${roll.attack.successes} vs ${roll.defense.successes} → ${roll.damage} damage.`,
  ).join(separator);
}
function turnOrderDetails(order: TurnOrder): string {
  return `<section class="turn-order"><h2 id="turn-order-label">Turn Order</h2><ol aria-labelledby="turn-order-label">
    ${order.map(({ combatant, successes }) => `<li>${combatant === 'hero' ? 'You' : 'Meadow slime'} · ${successes} ${successes === 1 ? 'success' : 'successes'}</li>`).join('')}
  </ol></section>`;
}

export function mountUi(root: HTMLElement): Ui {
  root.innerHTML = `
    <main class="game-shell">
      <header><span class="wordmark">SIMPLE RPG</span><span class="wave-indicator" aria-label="Current wave" hidden></span><span class="edition">ITERATION 09</span></header>
      <p id="combat-announcement" class="sr-only" role="status" aria-label="Combat result" aria-atomic="true"></p>
      <section class="play-area">
        <div class="world-frame"><div id="canvas" role="img" aria-label="A tiny woodland adventure"></div></div>
        <section class="panel" aria-label="Game controls">
          <div id="screen">
          <div class="eyebrow">A LITTLE ADVENTURE</div>
          <h1>Simple RPG</h1>
          <p class="description">A quiet clearing. Three little slimes.<br>A journey begins with one step.</p>
          <div class="actions"><button data-action="newGame" class="primary">New Game <span aria-hidden="true">↗</span></button><button disabled>Continue</button></div>
          </div>
          <p class="save-status" role="status" aria-label="Save status">No saved adventure yet.</p>
        </section>
      </section>
      <footer><span>A WORLD IN YOUR POCKET</span><span>TOUCH · KEYBOARD</span></footer>
    </main>`;
  let handler: (action: UiAction) => void = () => {};
  let observation:RosterObservation={status:'empty',raw:null,roster:{version:9,slots:[]}},canMutate=false;
  let roster:ReturnType<typeof mountRoster>|null=null;
  let discard:ReturnType<typeof mountConfirmation>|null=null;
  let creation: ReturnType<typeof mountCharacterCreation> | null = null;
  let focusNewAdventure=false;
  let currentState: GameState = { kind: 'title' };
  let currentStatus = '';
  let currentDirty=false;
  let currentCanSave=true;
  let busy = false;
  let active = true;
  let pointerAllowed = false;
  let pendingFocus: string | null = null;
  let announcedTurn: TurnRolls | null = null;
  let turnNumber = 0;
  const blockedKeys = new Set<string>();
  function closeCreation(){
    creation?.destroy();creation=null;root.querySelector('.game-shell')!.classList.remove('creating');
  }
  function commitCharacter(character:Character){
    if(!creation || !active || currentState.kind!=='title')return;
    handler({type:'newGame',character});
  }
  function openCreation(){
    if(creation || currentState.kind!=='title')return;
    roster?.destroy();roster=null;
    root.querySelector('.game-shell')!.classList.add('creating');
    creation=mountCharacterCreation(root.querySelector<HTMLElement>('#screen')!,{
      onBegin(character){
        if(!active)return;
        commitCharacter(character);
      },
      onCancel(){closeCreation();api.render(currentState,currentStatus);root.querySelector<HTMLButtonElement>('[data-roster="create"]')?.focus();},
    });
  }
  window.addEventListener('blur', () => { active = false; pointerAllowed = false; pendingFocus = null; });
  window.addEventListener('focus', () => { active = true; });
  document.addEventListener('visibilitychange', () => {
    active = !document.hidden;
    if (!active) { pointerAllowed = false; pendingFocus = null; }
  });
  const isBattleCommand = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-action="melee"], [data-action="magic"], [data-action="run"]');
  root.addEventListener('pointerdown', event => { pointerAllowed = active && (!busy || !isBattleCommand(event.target)); }, true);
  root.addEventListener('pointercancel', () => { pointerAllowed = false; }, true);
  root.addEventListener('keydown', event => {
    if(event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if ((busy && isBattleCommand(event.target)) || !active || event.repeat || blockedKeys.has(event.key)) {
      blockedKeys.add(event.key);
      event.preventDefault();
    }
  }, true);
  window.addEventListener('keyup', event => {
    if (blockedKeys.has(event.key)) { event.preventDefault(); blockedKeys.delete(event.key); }
  }, true);
  root.addEventListener('click', (event) => {
    if(creation||roster||discard)return;
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    if (!active || (event.detail > 0 && !pointerAllowed)) return;
    pointerAllowed = false;
    const rating = advancementRatings.find(rating => rating.key === button.dataset.rating);
    if (rating) handler({ type: 'spendPoint', rating });
    else if (button.dataset.direction) handler({ type: 'move', direction: button.dataset.direction as Direction });
    else if (button.dataset.action) handler({ type: button.dataset.action } as UiAction);
  });
  const api: Ui = {
    isConfirming(){return !!discard;},
    setRoster(next,allow){observation=next;canMutate=allow;roster?.update(next,allow);},
    onAction(next) { handler = next; },
    setCreationPending(value){creation?.setPending(value);roster?.setPending(value);},
    showCreationMessage(message){creation?.showMessage(message);},
    showRosterMessage(message){roster?.showMessage(message);},
    completeCreation(){closeCreation();focusNewAdventure=true;},
    confirmDiscard(){
      if(discard)return;
      discard=mountConfirmation(root.querySelector<HTMLElement>('#screen')!,{title:'Leave unsaved progress?',message:'Your latest progress could not be saved. Returning to characters discards these unsaved changes.',cancel:'Keep playing',confirm:'Discard unsaved progress',onCancel(){discard?.destroy();discard=null;api.render(currentState,currentStatus,currentDirty,currentCanSave);root.querySelector<HTMLButtonElement>('[data-direction="up"],#screen [data-action]')?.focus({preventScroll:true});},onConfirm(){discard?.destroy();discard=null;handler({type:'discardProgress'});}});
    },
    setBusy(nextBusy) {
      busy = nextBusy;
      root.querySelectorAll<HTMLButtonElement>('[data-action="melee"], [data-action="magic"], [data-action="run"]').forEach(button => {
        if (busy && document.activeElement === button) pendingFocus = button.dataset.action!;
        button.disabled = busy;
      });
      root.querySelector('#screen')!.setAttribute('aria-busy', String(busy));
      if (!busy && pendingFocus) {
        if (active && document.activeElement === document.body) root.querySelector<HTMLButtonElement>(`[data-action="${pendingFocus}"]`)?.focus({ preventScroll: true });
        pendingFocus = null;
      }
    },
    render(state, saveStatus, unsavedProgress=false, canSave=true) {
      const remaining = state.kind === 'title' ? 3 : getRemainingSlimeCount(state.checkpoint);
      const remainingText = `${remaining} ${remaining === 1 ? 'slime remains' : 'slimes remain'}.`;
      currentState = state;
      currentStatus = saveStatus;
      currentDirty=unsavedProgress;
      currentCanSave=canSave;
      const waveIndicator = root.querySelector<HTMLElement>('.wave-indicator')!;
      waveIndicator.hidden = state.kind === 'title';
      waveIndicator.textContent = state.kind === 'title' ? '' : `Wave ${state.checkpoint.slimeLevel}`;
      const canChange=canSave&&!unsavedProgress;
      const keepSheetOpen=!!root.querySelector('[data-character-sheet][open]');
      const focused = document.activeElement instanceof HTMLButtonElement && root.contains(document.activeElement) ? { action: document.activeElement.dataset.action, direction: document.activeElement.dataset.direction, rating: document.activeElement.dataset.rating } : null;
      const saveMessage = root.querySelector('[role="status"][aria-label="Save status"]')!;
      if (saveMessage.textContent !== saveStatus) saveMessage.textContent = saveStatus;
      if(discard)return;
      if(state.kind==='title'){
        root.querySelector('.game-shell')!.classList.add('roster-visible');
        if(creation)return;
        if(!roster)roster=mountRoster(root.querySelector<HTMLElement>('#screen')!,{onCreate:openCreation,onResume(id){focusNewAdventure=true;handler({type:'resumeSlot',id});},onRestart(id,revision){focusNewAdventure=true;handler({type:'restartSlot',id,revision});},onDelete(id,revision){handler({type:'deleteSlot',id,revision});},onReset(raw,legacy){handler({type:'resetRoster',raw,legacy});}});
        roster.update(observation,canMutate);return;
      }
      roster?.destroy();roster=null;root.querySelector('.game-shell')!.classList.remove('roster-visible');
      const maxHp=deriveStats(effectiveCharacter(state.checkpoint.character,state.checkpoint.progression)).maxHp;
      const reward=state.kind==='victory'?`+${state.xpAwarded} XP.${state.levelGained?` Level ${state.checkpoint.progression.level} reached.`:''}`:'';
      const slimeLevel = state.checkpoint.slimeLevel;
      const slimeLevelLabel = `<span aria-label="Slime level">Slime level ${slimeLevel}</span>`;
      const canFind = state.kind === 'exploring' && canFindMoreSlimes(state.checkpoint);
      if (state.kind === 'exploring') root.querySelector('#screen')!.innerHTML = `
        <h1>Find your way.</h1>
        <div class="stats"><span>HERO <strong aria-label="Hero health">${state.checkpoint.hp} / ${maxHp} HP</strong></span><span>POSITION <strong aria-label="Position">${state.checkpoint.position.x}, ${state.checkpoint.position.y}</strong></span><span>WORLD <strong aria-label="World size">${state.checkpoint.world.width} × ${state.checkpoint.world.height} tiles</strong></span></div>
        <p class="description"><span aria-label="Slimes remaining">${remainingText}</span><br>${remaining === 0 ? canFind ? 'The clearing is peaceful.' : 'There are no higher waves.' : 'Explore the clearing.'}</p>
        <nav class="dpad" aria-label="Movement"><button data-direction="up" aria-label="Move up">↑</button><button data-direction="left" aria-label="Move left">←</button><button data-direction="down" aria-label="Move down">↓</button><button data-direction="right" aria-label="Move right">→</button></nav>`;
      if (state.kind === 'battle') root.querySelector('#screen')!.innerHTML = `
        <div class="eyebrow">${slimeLevelLabel}</div><h1>Meadow slime</h1>
        <div class="stats"><span>HERO <strong aria-label="Hero health">${state.battle.heroHp} / ${maxHp} HP</strong></span><span>SLIME <strong aria-label="Slime health">${state.battle.enemyHp} / ${slimeStats(state.battle.slimeLevel).maxHp} HP</strong></span></div>
        ${turnOrderDetails(state.battle.turnOrder)}
        <p class="description combat-result">${state.battle.lastTurn ? turnSummary(state.battle.lastTurn) : `${OFFENSIVE_ACTIONS[state.battle.offense].label} ${state.battle.heroPools.attack}d10 vs ${slimeStats(state.battle.slimeLevel).defense}d10 defense.`}</p>
        <div class="actions"><button class="primary" data-action="${state.battle.offense}">${OFFENSIVE_ACTIONS[state.battle.offense].label}</button><button data-action="run">Run</button></div>`;
      if (state.kind === 'victory' || state.kind === 'defeat') {
        const won = state.kind === 'victory';
        root.querySelector('#screen')!.innerHTML = `<div class="eyebrow">${won ? remaining === 0 ? 'CLEARING COMPLETE' : 'SLIME DEFEATED' : 'ADVENTURE INTERRUPTED'}</div><h1>${won ? 'Victory!' : 'Defeated'}</h1><p class="description">${won ? `The slime slips away. Health restored.<br>${remainingText}<br>${reward}` : 'Even small adventures take practice.<br>Take a breath and begin again.'}</p><div class="actions"><button class="primary" data-action="${won ? 'acknowledgeVictory' : 'restart'}" ${!won&&!canChange?'disabled':''}>${won ? 'Back to clearing' : 'Restart'}</button></div>`;
      }
      {
        const turn = state.kind === 'battle' ? state.battle.lastTurn : state.kind === 'victory' || state.kind === 'defeat' ? state.lastTurn : null;
        const screen = root.querySelector('#screen')!;
        if ((state.kind === 'victory' || state.kind === 'defeat') && turn) screen.insertAdjacentHTML('beforeend', `<p class="description combat-result">${turnSummary(turn)}</p>`);
        if(canFind)screen.insertAdjacentHTML('beforeend',`<button class="roster-wide" data-action="findMoreSlimes" ${canChange?'':'disabled'}>Find more slimes</button>`);
        screen.insertAdjacentHTML('beforeend', rollDetails(turn) + characterDetails(state.checkpoint,state.kind==='exploring'&&canChange,keepSheetOpen));
        if(state.kind!=='battle')screen.insertAdjacentHTML('beforeend','<button class="roster-wide return-roster" data-action="returnToRoster">Return to characters</button>');
        if(unsavedProgress&&saveStatus.includes('cannot be saved')&&state.kind!=='battle')screen.insertAdjacentHTML('beforeend','<button class="roster-wide" data-action="retrySave">Retry save</button>');
        screen.querySelector('[aria-label="Character name"]')!.textContent=state.checkpoint.character.name;
        const announcement = root.querySelector('#combat-announcement')!;
        if (turn && turn !== announcedTurn) {
          announcedTurn = turn;
          turnNumber++;
          announcement.textContent = `Turn ${turnNumber}. ${turnSummary(turn, ' ')}${reward?' '+reward:''}`;
        } else if (!turn) {
          announcedTurn = null;
          turnNumber = 0;
          if (announcement.textContent) announcement.textContent = '';
        }
      }
      if(focusNewAdventure&&state.kind==='exploring'){
        window.scrollTo(0, 0);
        root.querySelector<HTMLButtonElement>('[data-direction="up"]')?.focus({preventScroll:true});focusNewAdventure=false;
      } else if (focused) {
        const selector = focused.rating ? `[data-rating="${focused.rating}"]` : focused.direction ? `[data-direction="${focused.direction}"]` : `[data-action="${focused.action}"]`;
        const target = root.querySelector<HTMLButtonElement>(selector);
        if (target&&!target.disabled) target.focus({ preventScroll: true });
        else if(focused.rating)root.querySelector<HTMLElement>('[data-character-sheet] summary')?.focus();
        else if(focused.action==='findMoreSlimes')root.querySelector<HTMLButtonElement>('[data-direction="up"]')?.focus();
        else root.querySelector<HTMLButtonElement>('#screen button')?.focus({ preventScroll: true });
      }
    },
  };
  return api;
}
