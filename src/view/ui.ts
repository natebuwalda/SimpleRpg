import type { Action, Checkpoint, Direction, GameState } from '../game/types';

export interface Ui {
  render(state: GameState, saveStatus: string): void;
  onAction(handler: (action: Action) => void): void;
  setBusy(busy: boolean): void;
  setSaved(checkpoint: Checkpoint | null): void;
}

export function mountUi(root: HTMLElement): Ui {
  root.innerHTML = `
    <main class="game-shell">
      <header><span class="wordmark">SIMPLE RPG</span><span class="edition">ITERATION 00</span></header>
      <section class="play-area">
        <div class="world-frame"><div id="canvas" role="img" aria-label="A tiny woodland adventure"></div></div>
        <section class="panel" aria-label="Game controls">
          <div id="screen">
          <div class="eyebrow">A LITTLE ADVENTURE</div>
          <h1>Simple RPG</h1>
          <p class="description">A quiet clearing. A small slime.<br>A journey begins with one step.</p>
          <div class="actions"><button data-action="newGame" class="primary">New Game <span aria-hidden="true">↗</span></button><button disabled>Continue</button></div>
          </div>
          <p class="save-status" role="status">No saved adventure yet.</p>
        </section>
      </section>
      <footer><span>A WORLD IN YOUR POCKET</span><span>TOUCH · KEYBOARD</span></footer>
    </main>`;
  let handler: (action: Action) => void = () => {};
  let saved: Checkpoint | null = null;
  let confirming = false;
  let currentState: GameState = { kind: 'title' };
  let currentStatus = '';
  root.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
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
    } else if (button.dataset.action) handler({ type: button.dataset.action } as Action);
  });
  const api: Ui = {
    setSaved(checkpoint) { saved = checkpoint; },
    onAction(next) { handler = next; },
    setBusy(busy) {
      root.querySelectorAll<HTMLButtonElement>('[data-action="attack"], [data-action="run"]').forEach(button => { button.disabled = busy; });
      root.querySelector('#screen')!.setAttribute('aria-busy', String(busy));
    },
    render(state, saveStatus) {
      currentState = state;
      currentStatus = saveStatus;
      const focused = document.activeElement instanceof HTMLButtonElement && root.contains(document.activeElement) ? { action: document.activeElement.dataset.action, direction: document.activeElement.dataset.direction } : null;
      root.querySelector('.save-status')!.textContent = saveStatus;
      if (state.kind === 'title') root.querySelector('#screen')!.innerHTML = confirming ? `
        <div class="eyebrow">A FRESH START</div><h1>Begin again?</h1><p class="description">Starting over will replace your saved adventure.</p><div class="actions"><button data-action="cancel">Cancel</button><button data-action="confirm" class="primary">Start Over</button></div>` : `
        <div class="eyebrow">A LITTLE ADVENTURE</div><h1>Simple RPG</h1><p class="description">A quiet clearing. A small slime.<br>A journey begins with one step.</p><div class="actions"><button data-action="newGame" class="primary">New Game <span aria-hidden="true">↗</span></button><button data-action="continue" ${saved ? '' : 'disabled'}>Continue</button></div>`;
      if (state.kind === 'exploring') root.querySelector('#screen')!.innerHTML = `
        <div class="eyebrow">THE FIRST CLEARING</div><h1>Find your way.</h1>
        <div class="stats"><span>HERO <strong aria-label="Hero health">${state.checkpoint.hp} / 12 HP</strong></span><span>POSITION <strong aria-label="Position">${state.checkpoint.position.x}, ${state.checkpoint.position.y}</strong></span></div>
        <p class="description">${state.checkpoint.completedEncounterIds.length ? 'The clearing is peaceful. Take a little wander.' : 'Follow the path. Find the little green slime.'}</p>
        <nav class="dpad" aria-label="Movement"><button data-direction="up" aria-label="Move up">↑</button><button data-direction="left" aria-label="Move left">←</button><button data-direction="down" aria-label="Move down">↓</button><button data-direction="right" aria-label="Move right">→</button></nav>`;
      if (state.kind === 'battle') root.querySelector('#screen')!.innerHTML = `
        <div class="eyebrow">A WILD ENCOUNTER</div><h1>Meadow slime</h1>
        <div class="stats"><span>HERO <strong aria-label="Hero health">${state.battle.heroHp} / 12 HP</strong></span><span>SLIME <strong aria-label="Slime health">${state.battle.enemyHp} / 6 HP</strong></span></div>
        <p class="description">${state.battle.enemyHp === 6 ? 'A little slime blocks your path. Your move.' : 'You deal 4 damage. The slime hits back for 2.'}</p>
        <div class="actions"><button class="primary" data-action="attack">Attack</button><button data-action="run">Run</button></div>`;
      if (state.kind === 'victory' || state.kind === 'defeat') {
        const won = state.kind === 'victory';
        root.querySelector('#screen')!.innerHTML = `<div class="eyebrow">${won ? 'CLEARING COMPLETE' : 'ADVENTURE INTERRUPTED'}</div><h1>${won ? 'Victory!' : 'Defeated'}</h1><p class="description">${won ? 'The slime slips away. Health restored.<br>The clearing is yours to explore.' : 'Even small adventures take practice.<br>Take a breath and begin again.'}</p><div class="actions"><button class="primary" data-action="${won ? 'acknowledgeVictory' : 'restart'}">${won ? 'Back to clearing' : 'Restart'}</button></div>`;
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
