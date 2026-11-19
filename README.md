# SimpleRpg

A small browser RPG built with TypeScript, Phaser, and Vite. Iteration 4 adds named character creation, point allocation and a read-only adventure sheet to the opposed-d10, three-slime adventure.

**[Play SimpleRpg](https://natebuwalda.github.io/SimpleRpg/)** — the published game follows accepted releases on main. The owner has accepted Iteration 3, delivered through [PR #4](https://github.com/natebuwalda/SimpleRpg/pull/4).

**[Acceptance game](https://natebuwalda.github.io/SimpleRpg/acceptance/)** — the latest candidate for phone acceptance. It uses separate browser saves from the main game.

## Development

Use Node 24.21.0 (see `.nvmrc`), then `npm ci` and `npm run dev`. Open the printed URL with `/SimpleRpg/` appended.

Checks: `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Before browser tests, run `npx playwright install chromium`. Cloud environments with an installed Chromium can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` for browser checks. Build output is `dist/`; `npm run preview` serves it locally.

Playwright traces/results use the OS temporary directory `simple-rpg-playwright` to avoid OneDrive file-locking issues. Set `PLAYWRIGHT_OUTPUT_DIR` to override it. Explicit phone screenshots remain under ignored `test-results/`.

Design and task plan are under `docs/superpowers/`.

Iteration 4 is being prepared on its feature branch; acceptance deployment and physical-phone acceptance await owner direction. The links above follow previously published builds until a deployment is requested.

## Play

Tap the directional buttons or press arrows/WASD to move one tile per press. Each New Game independently chooses a width and height of 20–40 tiles and places three stationary slimes on distinct traversable tiles, excluding the hero's start. Paths are decoration, not directions to the slimes. The panel shows 10 × 10 tiles; it scrolls only when needed to keep three visible tiles ahead, with a three-tile impassable forest border and no fog. Choose Attack or Run when you enter a living slime's tile. Run always succeeds and preserves damage already taken. Victory fully heals the hero and removes only that slime. The remaining count reaches zero when the whole clearing is peaceful. New Game asks before replacing an existing save.

New Game opens three creation steps: Attributes, Skills and Review. Enter a nonblank name (maximum 24 characters). Prowess, Cunning and Resistance each start at 1, with 5 additional points to spend; Combat, Subterfuge and Lore each start at 0, with a separate 5-point budget. Every rating caps at 5, and each budget must be fully spent before advancing. Combat 0 is valid, although only melee actions are currently playable. Derived Health, Initiative, resource capacity and melee pools update while allocating. Back preserves the draft; Cancel or refresh discards it without replacing the adventure. Begin adventure rechecks the current save and asks for confirmation before replacing it; a changed save requires fresh confirmation.

Health is Prowess + Resistance, Initiative is Prowess + Cunning, and resource capacity is Cunning + Resistance. Open **Character** below the adventure commands to inspect the name and read-only build. Current Health remains in the HUD. Characters stay fixed during an adventure, and Restart preserves the name/build at full derived Health. Reusable character rosters, editing/deletion, import/export and multiple adventure slots are deferred; the roster is planned for Iteration 5. Initiative scheduling, resource spending, classes, specializations, leveling, XP and gear also remain deferred.

Melee Attack rolls Prowess + Combat against slime Defense (3d10). Each 8, 9, or 10 scores one success. An original 10 keeps that success and adds one bonus d10; bonus dice also succeed on 8–10 but never add another die. Ones do nothing. Compare successes: ties favor the defender, and positive attacker margin is damage. If the 3-Health slime survives, it attacks with 3d10 against hero Resistance + Combat. The hero acts first. Misses and zero-damage turns are valid, so battle length varies. A short result shows successes and damage; **Roll details** shows original and bonus faces, including the finishing exchange on victory or defeat.

Progress saves automatically on this browser/device, including slime positions and independent defeats. Restart after defeat resets HP/progress and restores the same three slime placements in the same world. Refresh returns to the title; Continue resumes the last exploration checkpoint. Refreshing during battle or defeat restores the checkpoint before that encounter; it does not restore earlier defeated slimes.

Valid v1/v2/v3/v4 saves upgrade to v5 and receive the name Adventurer. v4 retains its accepted starter build, current Health, terrain, placements and completion exactly; its original fixed-build validator stays unchanged. Earlier formats first follow their accepted migrations: current Health capped at 5, unchanged positive values below 5, exact v3 terrain/placements/completion, two additional slimes for v1/v2 away from the start/current hero, and the (+2,+2) v1 coordinate translation. New v5 saves validate complete creation budgets and Health against the saved build's derived maximum. Original older keys remain as recovery copies. A present invalid newer save never falls back to stale older progress. If upgrade writes are blocked, Continue remains playable and the same upgrade is cached within that page session; reloading while all writes remain blocked may choose different added placements for v1/v2. A warning remains visible. Dice, active battles and creation drafts are not saved. Saves do not sync across devices and may be lost if browser data is cleared. Network access is required to load the game; offline play is not guaranteed.

Browser checks cover touch and keyboard, battle/reload/Continue, storage failures, and 320x568, 390x844, and 844x390 layouts. The owner also passed the physical-phone test plan and accepted Iteration 0.

## Iteration 4 manual acceptance

1. New Game: name a character; test both five-point budgets, base floors and rating caps. Confirm incomplete steps cannot advance. Try Combat 0 and watch derived values change; Back should preserve choices.
2. Cancel a draft and refresh during another draft: the prior adventure must remain available. At Review, Begin should confirm replacing an existing save; cancelling that confirmation returns to the same draft. If another tab saves while confirming, a second confirmation is required.
3. Try Prowess/Cunning/Resistance 1/5/2 and Combat/Subterfuge/Lore 0/5/0: maximum Health 3, Initiative 6, resource capacity 7, Attack 1d10 and Defense 2d10. Begin, open Character and inspect the name/read-only build. A 5/1/2 + 5/0/0 build instead has Health 7 and pools 10/7.
4. Fight, inspect rolls, Run after damage, refresh/Continue, win and lose. Victory heals to the chosen maximum; Restart preserves that character and the original world/placements while restoring all slimes and full Health.
5. On a phone, check creation, Review and Character in portrait/landscape, including a long name. Navigation stays reachable, long content scrolls vertically and text input does not trigger game movement.
6. Continue an older save: the hero becomes Adventurer without losing accepted progress. New Game is required to choose a different build. Production and acceptance progress remain separate.

## Hosting

GitHub Pages serves this project's production build at base path `/SimpleRpg/`. Checks run on pushes and pull requests. The Publish game workflow repeats checks, builds, and deploys only after success. Pages must use **GitHub Actions** as its source.

Releases deploy from `main` or a manually selected workflow ref permitted by the Pages environment. The temporary Iteration 0 feature-branch preview trigger has been removed. The public preview uses browser-local saves; no account data is sent to a server.

Publish game packages the main build at `/SimpleRpg/` and a pinned acceptance build at `/SimpleRpg/acceptance/`. The `ACCEPTANCE_REF` repository variable stores its full commit SHA; a manual `acceptance_ref` input overrides it for one deployment. See [acceptance hosting](docs/superpowers/acceptance-hosting.md) for the deployment procedure and the transitional behavior before this workflow is merged. With Playwright Chromium installed, verify both deployed paths and save isolation using `node scripts/verify-deployment.mjs https://natebuwalda.github.io/SimpleRpg/`.

The initial Actions deployment succeeded and the hosted game passed an automated touch exploration → battle → victory → refresh → Continue check with no failed asset requests or runtime errors. The owner also completed and accepted all physical-phone acceptance checks; see [implementation status](docs/superpowers/iteration-0-status.md).

Iteration 1 was accepted and merged in [PR #2](https://github.com/natebuwalda/SimpleRpg/pull/2). Iteration 2 verification and remaining release/phone acceptance steps are recorded in [Iteration 2 status](docs/superpowers/iteration-2-status.md).
