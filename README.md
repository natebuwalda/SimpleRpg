# SimpleRpg

A small browser RPG built with TypeScript, Phaser, and Vite. Iteration 1 adds larger saved worlds and buffered scrolling to the phone-friendly exploration and battle loop.

**[Play the browser game](https://natebuwalda.github.io/SimpleRpg/)** · [Iteration 0 pull request](https://github.com/natebuwalda/SimpleRpg/pull/1)

## Development

Use Node 24.21.0 (see `.nvmrc`), then `npm ci` and `npm run dev`. Open the printed URL with `/SimpleRpg/` appended.

Checks: `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Before browser tests, run `npx playwright install chromium`. Cloud environments with an installed Chromium can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` for browser checks. Build output is `dist/`; `npm run preview` serves it locally.

Design and task plan are under `docs/superpowers/`.

## Play

Tap the directional buttons or press arrows/WASD to move one tile per press. Each New Game independently chooses a width and height of 20–40 tiles. The panel shows 10 × 10 tiles; it scrolls only when needed to keep three visible tiles ahead, with a three-tile impassable forest border and no fog. Follow the path to the slime at (width−5, height−5); choose Attack or Run. Two attacks win. Run always succeeds. Victory heals the hero and clears the encounter. New Game asks before replacing an existing save.

Progress saves automatically on this browser/device, including the exact world definition. Restart after defeat resets progress in the same world. Valid Iteration 0 saves migrate to a 20 × 20 legacy world, translating the hero and landmarks by (+2,+2) and preserving HP and cleared encounters. The original v1 save remains as a recovery copy; an invalid v2 save never falls back to stale v1 progress. Refresh returns to the title; Continue resumes the last exploration checkpoint. Refreshing during battle or defeat restores the checkpoint before that encounter. Saves do not sync across devices and may be lost if browser data is cleared. Blocked or full browser storage allows play with a warning. Network access is required to load the game; offline play is not guaranteed.

Browser checks cover touch and keyboard, battle/reload/Continue, storage failures, and 320x568, 390x844, and 844x390 layouts. The owner also passed the physical-phone test plan and accepted Iteration 0.

## Hosting

GitHub Pages serves this project's production build at base path `/SimpleRpg/`. Checks run on pushes and pull requests. The Publish game workflow repeats checks, builds, and deploys only after success. Pages must use **GitHub Actions** as its source.

Releases deploy from `main` or a manually selected workflow ref permitted by the Pages environment. The temporary Iteration 0 feature-branch preview trigger has been removed. The public preview uses browser-local saves; no account data is sent to a server.

The initial Actions deployment succeeded and the hosted game passed an automated touch exploration → battle → victory → refresh → Continue check with no failed asset requests or runtime errors. The owner also completed and accepted all physical-phone acceptance checks; see [implementation status](docs/superpowers/iteration-0-status.md).

Iteration 1 verification and pending release/phone acceptance steps are recorded in [Iteration 1 status](docs/superpowers/iteration-1-status.md). The public game remains Iteration 0 until an authorized release.
