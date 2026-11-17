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
          <div class="eyebrow">A LITTLE ADVENTURE</div>
          <h1>Simple RPG</h1>
          <p class="description">A quiet clearing. A small slime.<br>A journey begins with one step.</p>
          <div class="actions"><button data-action="newGame" class="primary">New Game <span aria-hidden="true">↗</span></button><button disabled>Continue</button></div>
          <p class="save-status" role="status">No saved adventure yet.</p>
        </section>
      </section>
      <footer><span>A WORLD IN YOUR POCKET</span><span>TOUCH · KEYBOARD</span></footer>
    </main>`;
  let handler: (action: Action) => void = () => {};
  root.querySelector('[data-action="newGame"]')!.addEventListener('click', () => handler({ type: 'newGame' }));
  return {
    onAction(next) { handler = next; },
    render(_state, saveStatus) { root.querySelector('.save-status')!.textContent = saveStatus; },
  };
}
