# SimpleRpg

A small browser RPG built with TypeScript, Phaser, and Vite. Iteration 0 establishes a phone-friendly exploration and battle loop.

## Development

Use Node 24.21.0 (see `.nvmrc`), then `npm ci` and `npm run dev`. Open the printed URL with `/SimpleRpg/` appended.

Checks: `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Before browser tests, run `npx playwright install chromium`. Build output is `dist/`; `npm run preview` serves it locally.

Design and task plan are under `docs/superpowers/`.

## Play

Tap the directional buttons or press arrows/WASD to move one tile per press. Find the slime at (6,4); choose Attack or Run. Two attacks win. Run always succeeds. Victory heals the hero and clears the encounter. New Game asks before replacing an existing save.

Progress saves automatically on this browser/device. Refresh returns to the title; Continue resumes the last exploration checkpoint. Refreshing during battle or defeat restores the checkpoint before that encounter. Saves do not sync across devices and may be lost if browser data is cleared. Blocked or full browser storage allows play with a warning. Network access is required to load the game; offline play is not guaranteed.

Browser checks cover touch and keyboard, battle/reload/Continue, storage failures, and 320x568, 390x844, and 844x390 layouts. A physical-phone check is still required before accepting Iteration 0.
