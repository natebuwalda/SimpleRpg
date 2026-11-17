# SimpleRpg

A small browser RPG built with TypeScript, Phaser, and Vite. Iteration 3 adds a fixed starter character and opposed d10 combat to the three-slime adventure and buffered scrolling.

**[Play SimpleRpg](https://natebuwalda.github.io/SimpleRpg/)** — the published game follows accepted releases on main. Iteration 3 awaits owner acceptance and deployment.

## Development

Use Node 24.21.0 (see `.nvmrc`), then `npm ci` and `npm run dev`. Open the printed URL with `/SimpleRpg/` appended.

Checks: `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Before browser tests, run `npx playwright install chromium`. Cloud environments with an installed Chromium can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` for browser checks. Build output is `dist/`; `npm run preview` serves it locally.

Playwright traces/results use the OS temporary directory `simple-rpg-playwright` to avoid OneDrive file-locking issues. Set `PLAYWRIGHT_OUTPUT_DIR` to override it. Explicit phone screenshots remain under ignored `test-results/`.

Design and task plan are under `docs/superpowers/`.

## Play

Tap the directional buttons or press arrows/WASD to move one tile per press. Each New Game independently chooses a width and height of 20–40 tiles and places three stationary slimes on distinct traversable tiles, excluding the hero's start. Paths are decoration, not directions to the slimes. The panel shows 10 × 10 tiles; it scrolls only when needed to keep three visible tiles ahead, with a three-tile impassable forest border and no fog. Choose Attack or Run when you enter a living slime's tile. Run always succeeds and preserves damage already taken. Victory fully heals the hero and removes only that slime. The remaining count reaches zero when the whole clearing is peaceful. New Game asks before replacing an existing save.

The fixed starter spends 2/2/1 on both attributes and skills: Prowess 3, Cunning 3, Resistance 2; Combat 2, Subterfuge 2, Lore 1. Health is Prowess + Resistance (5), Initiative is Prowess + Cunning (6), and Resource capacity is Cunning + Resistance (5). Initiative scheduling, resource spending, classes, specializations, leveling, XP, gear, and allocation choices are deferred. Open **Character** below the commands to inspect these values.

Melee Attack rolls Prowess + Combat (5d10) against slime Defense (3d10). Each 8, 9, or 10 scores one success. An original 10 keeps that success and adds one bonus d10; bonus dice also succeed on 8–10 but never add another die. Ones do nothing. Compare successes: ties favor the defender, and positive attacker margin is damage. If the 3-Health slime survives, it attacks with 3d10 against hero Resistance + Combat (4d10). The hero acts first. Misses and zero-damage turns are valid, so battle length varies. A short result shows successes and damage; **Roll details** shows original and bonus faces, including the finishing exchange on victory or defeat.

Progress saves automatically on this browser/device, including slime positions and independent defeats. Restart after defeat resets HP/progress and restores the same three slime placements in the same world. Refresh returns to the title; Continue resumes the last exploration checkpoint. Refreshing during battle or defeat restores the checkpoint before that encounter; it does not restore earlier defeated slimes.

Valid v1/v2/v3 saves upgrade to v4 with the fixed starter character. Prior current Health is capped at 5; positive values below 5 remain unchanged. v3 retains all terrain, slime placements and completion exactly. v1/v2 retain the old slime and its defeated state and add two placements away from the start/current hero. v1 retains the accepted (+2,+2) legacy-world translation. Original older keys remain as recovery copies. A present invalid newer save never falls back to stale older progress. If upgrade writes are blocked, Continue remains playable and the same upgrade is cached within that page session; reloading while all writes remain blocked may choose different added placements for v1/v2. A warning remains visible. Dice and active battles are not saved. Saves do not sync across devices and may be lost if browser data is cleared. Network access is required to load the game; offline play is not guaranteed.

Browser checks cover touch and keyboard, battle/reload/Continue, storage failures, and 320x568, 390x844, and 844x390 layouts. The owner also passed the physical-phone test plan and accepted Iteration 0.

## Iteration 3 manual acceptance

1. Start or Continue, open Character, and confirm attributes 3/3/2, skills 2/2/1, Health 5, Initiative 6, Resource capacity 5, and Attack/Defense 5d10/4d10.
2. Find a slime: it starts at 3 Health. Attack and inspect Roll details; compare successes and damage, including misses/ties. Check any original 10 keeps its success and adds one nonchaining bonus die. Battles may take different numbers of turns.
3. Win and return: Health restores to 5, only that slime disappears, and refresh/Continue preserves progress. Flee after taking damage and confirm current Health persists. Lose and Restart: the same map/placements return with all three slimes and full Health.
4. On a phone, use movement, Attack/Run, and the expandable details in portrait and landscape. Primary commands should remain readable and reachable; repeated/held input must not queue turns.
5. Continue an older save if available: preserve the map and cleared slimes, clamp old Health to 5, and retain the older recovery entry. Reload and Continue again to confirm stable results.

## Hosting

GitHub Pages serves this project's production build at base path `/SimpleRpg/`. Checks run on pushes and pull requests. The Publish game workflow repeats checks, builds, and deploys only after success. Pages must use **GitHub Actions** as its source.

Releases deploy from `main` or a manually selected workflow ref permitted by the Pages environment. The temporary Iteration 0 feature-branch preview trigger has been removed. The public preview uses browser-local saves; no account data is sent to a server.

The initial Actions deployment succeeded and the hosted game passed an automated touch exploration → battle → victory → refresh → Continue check with no failed asset requests or runtime errors. The owner also completed and accepted all physical-phone acceptance checks; see [implementation status](docs/superpowers/iteration-0-status.md).

Iteration 1 was accepted and merged in [PR #2](https://github.com/natebuwalda/SimpleRpg/pull/2). Iteration 2 verification and remaining release/phone acceptance steps are recorded in [Iteration 2 status](docs/superpowers/iteration-2-status.md).
