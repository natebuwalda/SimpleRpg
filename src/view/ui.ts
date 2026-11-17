import type { UiAction, Checkpoint, Direction, GameState, TurnRolls, Character } from '../game/types';
import { deriveStats, getMeleePools } from '../game/character';
import type { PoolRoll } from '../game/dice';
import { SLIME } from '../game/battle';
import { getRemainingSlimeCount } from '../game/world';

export interface Ui {
  render(state: GameState, saveStatus: string): void;
  onAction(handler: (action: UiAction) => void): void;
  setBusy(busy: boolean): void;
  setSaved(checkpoint: Checkpoint | null): void;
  onTitleAction(handler: () => void): void;
}

function characterDetails(character: Character): string {
  const a = character.attributes, s = character.skills, stats = deriveStats(character), pools = getMeleePools(character);
  return `<details class="game-details"><summary>Character</summary><div class="detail-content">
    <p aria-label="Character attributes">Prowess ${a.prowess} · Cunning ${a.cunning} · Resistance ${a.resistance}</p>
    <p aria-label="Character skills">Combat ${s.combat} · Subterfuge ${s.subterfuge} · Lore ${s.lore}</p>
    <p aria-label="Derived stats">Health ${stats.maxHp} · Initiative ${stats.initiative} · Resource capacity ${stats.resourceCapacity}</p>
    <p aria-label="Melee pools">Attack ${pools.attack}d10 · Defense ${pools.defense}d10</p></div></details>`;
}
function diceText(label: string, roll: PoolRoll): string {
  return `<p aria-label="${label}"><strong>${label}</strong><br>Original: ${roll.original.join(', ')}. Bonus: ${roll.bonus.join(', ') || 'none'}. Successes: ${roll.successes}.</p>`;
}
function rollDetails(turn: TurnRolls | null | undefined): string {
  if (!turn) return '';
  return `<details class="game-details"><summary>Roll details</summary><div class="detail-content">
    ${diceText('Your attack dice', turn.hero.attack)}${diceText('Slime defense dice', turn.hero.defense)}
    ${turn.slime ? diceText('Slime attack dice', turn.slime.attack) + diceText('Your defense dice', turn.slime.defense) : '<p>No counterattack.</p>'}
    <p>8–10 succeeds. Each original 10 adds one bonus die; bonus dice never add another. Ties favor the defender.</p></div></details>`;
}
function turnSummary(turn: TurnRolls | null | undefined): string {
  if (!turn) return 'Attack 5d10 vs 3d10 defense.';
  return `You: ${turn.hero.attack.successes} vs ${turn.hero.defense.successes} → ${turn.hero.damage} damage.`
    + (turn.slime ? `<br>Slime: ${turn.slime.attack.successes} vs ${turn.slime.defense.successes} → ${turn.slime.damage} damage.` : '');
}

export function mountUi(root: HTMLElement): Ui {
  root.innerHTML = `
    <main class="game-shell">
      <header><span class="wordmark">SIMPLE RPG</span><span class="edition">ITERATION 03</span></header>
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
  let saved: Checkpoint | null = null;
  let confirming = false;
  let currentState: GameState = { kind: 'title' };
  let currentStatus = '';
  let beforeTitleAction = () => {};
  let busy = false;
  let active = true;
  let pointerAllowed = false;
  let pendingFocus: string | null = null;
  let announcedTurn: TurnRolls | null = null;
  let turnNumber = 0;
  const blockedKeys = new Set<string>();
  window.addEventListener('blur', () => { active = false; pointerAllowed = false; pendingFocus = null; });
  window.addEventListener('focus', () => { active = true; });
  document.addEventListener('visibilitychange', () => {
    active = !document.hidden;
    if (!active) { pointerAllowed = false; pendingFocus = null; }
  });
  const isBattleCommand = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-action="attack"], [data-action="run"]');
  root.addEventListener('pointerdown', event => { pointerAllowed = active && (!busy || !isBattleCommand(event.target)); }, true);
  root.addEventListener('pointercancel', () => { pointerAllowed = false; }, true);
  root.addEventListener('keydown', event => {
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
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    if (!active || (event.detail > 0 && !pointerAllowed)) return;
    pointerAllowed = false;
    if (button.dataset.action === 'newGame' || button.dataset.action === 'continue') beforeTitleAction();
    if (button.dataset.direction) handler({ type: 'move', direction: button.dataset.direction as Direction });
    else if (button.dataset.action === 'continue') {
      if (saved) handler({ type: 'continue', checkpoint: saved });
    } else if (button.dataset.action === 'newGame' && saved) {
      confirming = true;
      api.render(currentState, currentStatus);
      root.querySelector<HTMLButtonElement>('[data-action="cancel"]')?.focus();
    } else if (button.dataset.action === 'cancel') {
      confirming = false;
      api.render(currentState, currentStatus);
      root.querySelector<HTMLButtonElement>('[data-action="newGame"]')?.focus();
    } else if (button.dataset.action === 'confirm') {
      confirming = false;
      handler({ type: 'newGame' });
    } else if (button.dataset.action) handler({ type: button.dataset.action } as UiAction);
  });
  const api: Ui = {
    setSaved(checkpoint) { saved = checkpoint; },
    onTitleAction(next) { beforeTitleAction = next; },
    onAction(next) { handler = next; },
    setBusy(nextBusy) {
      busy = nextBusy;
      root.querySelectorAll<HTMLButtonElement>('[data-action="attack"], [data-action="run"]').forEach(button => {
        if (busy && document.activeElement === button) pendingFocus = button.dataset.action!;
        button.disabled = busy;
      });
      root.querySelector('#screen')!.setAttribute('aria-busy', String(busy));
      if (!busy && pendingFocus) {
        if (active && document.activeElement === document.body) root.querySelector<HTMLButtonElement>(`[data-action="${pendingFocus}"]`)?.focus({ preventScroll: true });
        pendingFocus = null;
      }
    },
    render(state, saveStatus) {
      const remaining = state.kind === 'title' ? 3 : getRemainingSlimeCount(state.checkpoint);
      const remainingText = `${remaining} ${remaining === 1 ? 'slime remains' : 'slimes remain'}.`;
      currentState = state;
      currentStatus = saveStatus;
      const focused = document.activeElement instanceof HTMLButtonElement && root.contains(document.activeElement) ? { action: document.activeElement.dataset.action, direction: document.activeElement.dataset.direction } : null;
      const saveMessage = root.querySelector('.save-status')!;
      if (saveMessage.textContent !== saveStatus) saveMessage.textContent = saveStatus;
      if (state.kind === 'title') root.querySelector('#screen')!.innerHTML = confirming ? `
        <div class="eyebrow">A FRESH START</div><h1>Begin again?</h1><p class="description">Starting over will replace your saved adventure.</p><div class="actions"><button data-action="cancel">Cancel</button><button data-action="confirm" class="primary">Start Over</button></div>` : `
        <div class="eyebrow">A LITTLE ADVENTURE</div><h1>Simple RPG</h1><p class="description">A quiet clearing. Three little slimes.<br>A journey begins with one step.</p><div class="actions"><button data-action="newGame" class="primary">New Game <span aria-hidden="true">↗</span></button><button data-action="continue" ${saved ? '' : 'disabled'}>Continue</button></div>`;
      if (state.kind === 'exploring') root.querySelector('#screen')!.innerHTML = `
        <div class="eyebrow">THE FIRST CLEARING</div><h1>Find your way.</h1>
        <div class="stats"><span>HERO <strong aria-label="Hero health">${state.checkpoint.hp} / ${deriveStats(state.checkpoint.character).maxHp} HP</strong></span><span>POSITION <strong aria-label="Position">${state.checkpoint.position.x}, ${state.checkpoint.position.y}</strong></span><span>WORLD <strong aria-label="World size">${state.checkpoint.world.width} × ${state.checkpoint.world.height} tiles</strong></span></div>
        <p class="description"><span aria-label="Slimes remaining">${remainingText}</span><br>${remaining === 0 ? 'The clearing is peaceful.' : 'Explore the clearing.'}</p>
        <nav class="dpad" aria-label="Movement"><button data-direction="up" aria-label="Move up">↑</button><button data-direction="left" aria-label="Move left">←</button><button data-direction="down" aria-label="Move down">↓</button><button data-direction="right" aria-label="Move right">→</button></nav>`;
      if (state.kind === 'battle') root.querySelector('#screen')!.innerHTML = `
        <div class="eyebrow">A WILD ENCOUNTER</div><h1>Meadow slime</h1>
        <div class="stats"><span>HERO <strong aria-label="Hero health">${state.battle.heroHp} / ${deriveStats(state.checkpoint.character).maxHp} HP</strong></span><span>SLIME <strong aria-label="Slime health">${state.battle.enemyHp} / ${SLIME.maxHp} HP</strong></span></div>
        <p class="description combat-result">${turnSummary(state.battle.lastTurn)}</p>
        <div class="actions"><button class="primary" data-action="attack">Attack</button><button data-action="run">Run</button></div>`;
      if (state.kind === 'victory' || state.kind === 'defeat') {
        const won = state.kind === 'victory';
        root.querySelector('#screen')!.innerHTML = `<div class="eyebrow">${won ? remaining === 0 ? 'CLEARING COMPLETE' : 'SLIME DEFEATED' : 'ADVENTURE INTERRUPTED'}</div><h1>${won ? 'Victory!' : 'Defeated'}</h1><p class="description">${won ? `The slime slips away. Health restored.<br>${remainingText}` : 'Even small adventures take practice.<br>Take a breath and begin again.'}</p><div class="actions"><button class="primary" data-action="${won ? 'acknowledgeVictory' : 'restart'}">${won ? 'Back to clearing' : 'Restart'}</button></div>`;
      }
      if (state.kind !== 'title') {
        const turn = state.kind === 'battle' ? state.battle.lastTurn : state.kind === 'victory' || state.kind === 'defeat' ? state.lastTurn : null;
        const screen = root.querySelector('#screen')!;
        if ((state.kind === 'victory' || state.kind === 'defeat') && turn) screen.insertAdjacentHTML('beforeend', `<p class="description combat-result">${turnSummary(turn)}</p>`);
        screen.insertAdjacentHTML('beforeend', rollDetails(turn) + characterDetails(state.checkpoint.character));
        const announcement = root.querySelector('#combat-announcement')!;
        if (turn && turn !== announcedTurn) {
          announcedTurn = turn;
          turnNumber++;
          announcement.textContent = `Turn ${turnNumber}. ${turnSummary(turn).replace('<br>', ' ')}`;
        } else if (!turn) {
          announcedTurn = null;
          turnNumber = 0;
          if (announcement.textContent) announcement.textContent = '';
        }
      }
      if (focused) {
        const selector = focused.direction ? `[data-direction="${focused.direction}"]` : `[data-action="${focused.action}"]`;
        const target = root.querySelector<HTMLButtonElement>(selector);
        if (target) target.focus({ preventScroll: true });
        else root.querySelector<HTMLButtonElement>('#screen button')?.focus({ preventScroll: true });
      }
    },
  };
  return api;
}
