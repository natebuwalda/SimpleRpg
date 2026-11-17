# SimpleRpg

A small browser RPG built with TypeScript, Phaser, and Vite. Iteration 0 establishes a phone-friendly exploration and battle loop.

## Development

Use Node 24.21.0 (see `.nvmrc`), then `npm ci` and `npm run dev`. Open the printed URL with `/SimpleRpg/` appended. The initial shell has a title screen and generated woodland placeholder art.

Checks: `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Before browser tests, run `npx playwright install chromium`. Build output is `dist/`; `npm run preview` serves it locally.

Design and task plan are under `docs/superpowers/`.
