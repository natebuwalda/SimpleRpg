# SimpleRpg

A small browser RPG built with TypeScript, Phaser, and Vite. Iteration 2 adds three independently tracked random slime placements to the saved worlds and buffered scrolling.

**[Play the Iteration 2 exploratory preview](https://natebuwalda.github.io/SimpleRpg/)** — deployed from the feature branch for phone testing; its PR remains unmerged.

## Development

Use Node 24.21.0 (see `.nvmrc`), then `npm ci` and `npm run dev`. Open the printed URL with `/SimpleRpg/` appended.

Checks: `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Before browser tests, run `npx playwright install chromium`. Cloud environments with an installed Chromium can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` for browser checks. Build output is `dist/`; `npm run preview` serves it locally.

Playwright traces/results use the OS temporary directory `simple-rpg-playwright` to avoid OneDrive file-locking issues. Set `PLAYWRIGHT_OUTPUT_DIR` to override it. Explicit phone screenshots remain under ignored `test-results/`.

Design and task plan are under `docs/superpowers/`.

## Play

Tap the directional buttons or press arrows/WASD to move one tile per press. Each New Game independently chooses a width and height of 20–40 tiles and places three stationary slimes on distinct traversable tiles, excluding the hero's start. Paths are decoration, not directions to the slimes. The panel shows 10 × 10 tiles; it scrolls only when needed to keep three visible tiles ahead, with a three-tile impassable forest border and no fog. Choose Attack or Run when you enter a living slime's tile. Two attacks win; Run always succeeds. Victory heals the hero and removes only that slime. The remaining count reaches zero when the whole clearing is peaceful. New Game asks before replacing an existing save.

Progress saves automatically on this browser/device, including slime positions and independent defeats. Restart after defeat resets HP/progress and restores the same three slime placements in the same world. Refresh returns to the title; Continue resumes the last exploration checkpoint. Refreshing during battle or defeat restores the checkpoint before that encounter; it does not restore earlier defeated slimes.

Valid v1/v2 saves upgrade to v3, retaining the old slime and its defeated state and adding two placements away from the start/current hero. v1 retains the accepted (+2,+2) legacy-world translation. Original older keys remain as recovery copies. A present invalid newer save never falls back to stale older progress. If upgrade writes are blocked, Continue remains playable and the same upgrade is cached within that page session; reloading while all writes remain blocked may choose different added placements. A warning remains visible. Saves do not sync across devices and may be lost if browser data is cleared. Network access is required to load the game; offline play is not guaranteed.

Browser checks cover touch and keyboard, battle/reload/Continue, storage failures, and 320x568, 390x844, and 844x390 layouts. The owner also passed the physical-phone test plan and accepted Iteration 0.

## Hosting

GitHub Pages serves this project's production build at base path `/SimpleRpg/`. Checks run on pushes and pull requests. The Publish game workflow repeats checks, builds, and deploys only after success. Pages must use **GitHub Actions** as its source.

Releases deploy from `main` or a manually selected workflow ref permitted by the Pages environment. The temporary Iteration 0 feature-branch preview trigger has been removed. The public preview uses browser-local saves; no account data is sent to a server.

The initial Actions deployment succeeded and the hosted game passed an automated touch exploration → battle → victory → refresh → Continue check with no failed asset requests or runtime errors. The owner also completed and accepted all physical-phone acceptance checks; see [implementation status](docs/superpowers/iteration-0-status.md).

Iteration 1 was accepted and merged in [PR #2](https://github.com/natebuwalda/SimpleRpg/pull/2). Iteration 2 verification and remaining release/phone acceptance steps are recorded in [Iteration 2 status](docs/superpowers/iteration-2-status.md).
