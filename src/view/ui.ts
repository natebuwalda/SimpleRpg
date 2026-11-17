import type { Action, GameState } from '../game/types';

export interface Ui {
  render(state: GameState, saveStatus: string): void;
  onAction(handler: (action: Action) => void): void;
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
  root.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    if (button.dataset.direction) handler({ type: 'move', direction: button.dataset.direction as import('../game/types').Direction });
    else if (button.dataset.action === 'newGame') handler({ type: 'newGame' });
  });
  return {
    onAction(next) { handler = next; },
    render(state, saveStatus) {
      root.querySelector('.save-status')!.textContent = saveStatus;
      if (state.kind === 'exploring') root.querySelector('#screen')!.innerHTML = `
        <div class="eyebrow">THE FIRST CLEARING</div><h1>Find your way.</h1>
        <div class="stats"><span>HERO <strong>${state.checkpoint.hp} / 12 HP</strong></span><span>POSITION <strong aria-label="Position">${state.checkpoint.position.x}, ${state.checkpoint.position.y}</strong></span></div>
        <p class="description">Follow the path. Find the little green slime.</p>
        <nav class="dpad" aria-label="Movement"><button data-direction="up" aria-label="Move up">↑</button><button data-direction="left" aria-label="Move left">←</button><button data-direction="down" aria-label="Move down">↓</button><button data-direction="right" aria-label="Move right">→</button></nav>`;
    },
  };
}
