# Iteration 3: Attributes and dice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. The owner has selected native execution; preserve that choice.

**Goal:** Replace fixed damage with understandable opposed d10 combat using the agreed fixed starter character, while preserving the existing adventure and saves.

**Architecture:** Keep character calculations and dice resolution pure and independent of Phaser. Integrate their results into the existing session reducer, introduce checkpoint v4 with layered migrations, and render compact combat summaries with expandable details. Inject randomness through the combat functions for exact tests.

**Tech Stack:** Existing TypeScript, Phaser, Vite, Vitest, and Playwright; no new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-17-iteration-3-design.md` (approved).

## Global Constraints

- Starter attributes: Prowess 3, Cunning 3, Resistance 2. Starter skills: Combat 2, Subterfuge 2, Lore 1.
- Health maximum 5; Initiative 6; Resource capacity 5. Hero melee Attack 5d10, Defense 4d10.
- Slimes have fixed 3d10 Attack, 3d10 Defense, and 3 Health.
- Each original 8–10 scores one success. Each original 10 keeps its success and adds one bonus die; bonus dice succeed on 8–10 and never chain. Ones never subtract successes.
- Roll all original dice before bonus dice. Ties favor the defender; damage is max(0, attacker successes − defender successes).
- Preserve hero-first turns, skip counterattacks after lethal hits, allow zero-damage turns, and retain the existing 300 ms command lock.
- Victory fully heals; Run preserves damage; Restart restores Health and all three original slime placements on the same map.
- Classes, specializations, resource spending, XP, leveling, gear, allocation screens, initiative scheduling, and additional attack modes are out of scope.
- Retain terrain, camera, slime placement/completion, touch/keyboard access, recovery save keys, newest-present-save precedence, and blocked-write migration stability.
- Native execution; no new cloud chat or deployment without owner direction.

## Review Focus

1. Bonus 10s must stop; zero successes and ties must not create damage or forced rerolls (Task 1).
2. Lethal attacks, Run, terminal states, and blocked input must consume no unintended dice or extra turns (Tasks 3 and 4).
3. Old HP values 6–12 must validate under the old rules before clamping; malformed newest saves must not fall back silently (Task 2).
4. Blocked migration writes and focus/storage refreshes must not reroll old slime placements or reset valid progress (Tasks 2 and 4).
5. Long dice results and larger fonts must leave primary commands usable on small phones (Task 4).

## File responsibilities and contracts

- Create `src/game/character.ts`: fixed starter factory, derived stats, melee pools, and exact starter validation. `Character` contains `attributes: { prowess, cunning, resistance }` and `skills: { combat, subterfuge, lore }`, all numeric. Export `createStarterCharacter(): Character`, `deriveStats(character): { maxHp, initiative, resourceCapacity }`, `getMeleePools(character): { attack, defense }`, and `isStarterCharacter(value: unknown): value is Character`. Each factory call returns independent nested objects. Persist only this iteration's exact fixed build; future advancement changes are deferred.
- Create `src/game/dice.ts`: `RandomSource = () => number`; `PoolRoll = { original: number[]; bonus: number[]; successes: number }`; `OpposedRoll = { attack: PoolRoll; defense: PoolRoll; damage: number }`. Export `rollPool(size: number, rng?: RandomSource): PoolRoll` and `rollOpposed(attackSize: number, defenseSize: number, rng?: RandomSource): OpposedRoll`. Default RNG is `Math.random`, faces are `1 + floor(rng() * 10)`, and sizes are nonnegative integers. Reject invalid sizes with RangeError; RNG contract is finite values in [0,1). Resolve attack's complete pool before defense's complete pool.
- Modify `src/game/types.ts`: export/import `Character`, upgrade `Checkpoint` to version 4 with `character: Character`, and extend `BattleState` with `heroPools: { attack: number; defense: number }` and `lastTurn: { hero: OpposedRoll; slime: OpposedRoll | null } | null`. Roll records are transient. Preserve terminal victory feedback through an optional `lastTurn` on the victory state, never in checkpoints.
- Modify `src/game/save-validation.ts`, `src/game/legacy-save.ts`, and `src/game/save.ts`: current v4 validation plus explicitly versioned old validation/migration. Keep the accepted v3 world shape (world version 2). Preserve public load/save result shapes and migration resolver semantics.
- Modify `src/game/world.ts`: create v4 checkpoints with independent starter data and derived full Health. Remove the old shared `MAX_HP = 12` assumption; old validators own their historical cap.
- Modify `src/game/battle.ts` and `src/game/session.ts`: resolve opposed exchanges and carry their feedback through existing state transitions.
- Modify `src/view/ui.ts` and `src/style.css`: dynamic Health and roll summaries, read-only character details, and iteration label 03. Keep primary commands above expandable details.
- Modify `tests/fixtures.ts`, affected unit tests, and `e2e/helpers.ts`: current v4 fixtures and exact combat sequences, keeping separate historical fixtures. Create `tests/character.test.ts`, `tests/dice.test.ts`, `tests/character-save.test.ts`, and `e2e/combat.spec.ts`.
- Update `README.md` with the shipped rules, save upgrade behavior, and manual acceptance steps. No workflow changes are required.

### Task 1: Pure character and dice rules

**Files:** Create `src/game/character.ts`, `src/game/dice.ts`, `tests/character.test.ts`, `tests/dice.test.ts`.

**Interfaces:** Produces the character and dice contracts above; consumes no renderer or storage APIs.

- [x] Write character tests asserting exact attributes/skills, `{ maxHp: 5, initiative: 6, resourceCapacity: 5 }`, `{ attack: 5, defense: 4 }`, independent factory objects, and rejection of missing, fractional, nonfinite, or altered starter values.
- [x] Write dice tests using scripted faces: `[1,7,8,9]` yields 2 successes; original `[10,8,3]` plus bonus `[10]` yields 3; original `[10,10]` plus bonus `[1,10]` yields 3 and exactly 4 RNG calls. A zero pool consumes no RNG; invalid sizes -1, 1.5, NaN, and Infinity throw RangeError.
- [x] Write opposed tests proving attacker 3 successes versus defender 1 gives damage 2; ties and defender wins give 0; all misses give 0. Assert original/bonus arrays and attack-before-defense RNG order.
- [x] Run `npm test -- tests/character.test.ts tests/dice.test.ts`; expect failure because the modules do not exist.
- [x] Implement only the declared pure interfaces and fixed values.
- [x] Rerun the targeted tests and `npm run typecheck`; expect all pass. Commit as `feat: add starter character and opposed d10 rules`.

### Task 2: Checkpoint v4 and lossless save upgrades

**Files:** Modify `src/game/types.ts`, `src/game/world.ts`, `src/game/save-validation.ts`, `src/game/legacy-save.ts`, `src/game/save.ts`, `src/game/session.ts`, `src/view/ui.ts`, `tests/fixtures.ts`, `tests/save.test.ts`, `tests/slime-save.test.ts`, and affected checkpoint literals in tests/e2e; create `tests/character-save.test.ts`.

**Interfaces:** Consumes Task 1's character functions. Produces `Checkpoint { version: 4; character: Character; world; position; hp; completedEncounterIds }`. Keep existing `parseSave`, `loadSave`, and `saveGame` signatures; current key becomes `simple-rpg.save.v4` using the existing key naming pattern verified in `save.ts`, and retain literal v3/v2/v1 keys. Expose a separate old-v3 decoder in `legacy-save.ts` with the old checkpoint shape; do not cast old data to current `Checkpoint`.

- [x] Write v4 round-trip tests asserting character, world, position, and completion equality. Reject missing/altered character data and HP outside integer 1–5. Assert New Game/Restart checkpoint construction starts at 5 and stores independent starter data.
- [x] Write historical migration tests: valid v3 HP 12 and 6 become 5; HP 2 remains 2; HP 0, 13, and fractional values remain invalid. Preserve exact v3 placements and completion without calling RNG. Layer existing v2/v1 migrations, retaining legacy terrain and original encounter progress before adding character data.
- [x] Write precedence tests covering absence-only fallback v4→v3→v2→v1, mismatched key/schema versions, malformed newest values, and unchanged older recovery keys. Write blocked-write tests asserting repeated migration resolution for the same source retains placements and HP; changing source invalidates the cached result.
- [x] Run `npm test -- tests/character-save.test.ts tests/save.test.ts tests/slime-save.test.ts`; expect new assertions to fail.
- [x] Parameterize progress validation with an explicit Health cap: historical formats use 12; current format uses derived maxHp. Add v3 decoding and v4 migration, preserving the existing storage result/status contract and migration resolver. Update shared checkpoint construction and fixtures; retain explicitly historical fixtures as their original schemas. Replace `MAX_HP` imports and hardcoded hero Health in session/UI with `deriveStats(checkpoint.character).maxHp` so this task compiles independently. Mechanically update current Health expectations to 5; opposed combat and battle-state extensions belong to Task 3.
- [x] Run `npm test` and `npm run typecheck`; expect all unit tests and compilation to pass. Commit as `feat: persist starter characters and migrate earlier saves`.

### Task 3: Opposed melee in the session loop

**Files:** Modify `src/game/types.ts`, `src/game/battle.ts`, `src/game/session.ts`, `tests/battle.test.ts`, `tests/session.test.ts`, `tests/encounters.test.ts`.

**Interfaces:** Consumes `getMeleePools`, `deriveStats`, and `rollOpposed`. Produces `createBattle(heroHp: number, character: Character): BattleState`, `resolveTurn(state: BattleState, command: 'attack' | 'run', rng?: RandomSource): BattleState`, and `transition(state: GameState, action: Action, rng?: RandomSource): GameState`. Slime Health/Attack/Defense constants are 3/3/3 in `battle.ts`. Preserve the existing two-argument transition call in production by defaulting RNG.

- [x] Replace fixed-damage tests with exact scripted exchanges: hero margin 2 takes slime 3→1; slime margin 3 takes hero 5→2; ties/misses and defender wins preserve HP. Assert the hero uses 5/4 dice and slime 3/3, including complete roll records.
- [x] Add lethal-hit tests with a finite script that throws on any counterattack call; assert victory, enemy HP 0, and `lastTurn.slime === null`. Add lethal slime counterattack, Health clamping, Run and terminal-state tests that use a throwing RNG to prove no rolls occur.
- [x] Add session assertions for full healing to 5 on victory, only the encountered slime completing, safe return position, damage retained after Run, full 5-Health Restart with the same map/placements, and no checkpoint dice history. Assert victory retains its finishing exchange for the UI.
- [x] Run `npm test -- tests/battle.test.ts tests/session.test.ts tests/encounters.test.ts`; expect failures against deterministic combat.
- [x] Implement the declared interfaces and the approved attack/counterattack sequence, preserving existing action/state guards. Do not force progress on misses or introduce initiative scheduling.
- [x] Run `npm test` and `npm run typecheck`; expect all pass. Commit as `feat: resolve melee combat with opposed success pools`.

### Task 4: Phone feedback and deterministic browser coverage

**Files:** Modify `src/view/ui.ts`, `src/style.css`, `e2e/helpers.ts`, `e2e/game.spec.ts`, `e2e/slimes.spec.ts`, `e2e/world.spec.ts`; create `e2e/combat.spec.ts`.

**Interfaces:** Consumes checkpoint character data, derived stats, and battle/victory `lastTurn`. Produces accessible visible summaries and a test-only Playwright helper `setCombatFaces(page, faces: number[]): Promise<void>` in `e2e/helpers.ts`; no production debug controls or URL switches.

- [x] Add browser assertions for hero Health 5/5, slime 3/3, fixed character attributes/skills, derived values, and effective 5d10/4d10 pools. Add exact-roll scenarios for ties, bonus-10 nonchaining, damaging counterattacks, lethal victory, Run, defeat/Restart, and completion of all three independent slimes.
- [x] Adapt existing battle/input tests to scripted outcomes instead of assuming fixed damage. Implement the browser helper by replacing `window.Math.random` immediately before an Attack with a finite face sequence, translating face n to `(n - 0.5) / 10`; restore the original function when the last supplied value is consumed. Keep map generation outside the override. Assert expected HP/results so incidental consumption fails the test rather than silently masking it.
- [x] Run `npm run test:e2e -- e2e/combat.spec.ts`; expect failures for missing feedback and old UI values.
- [x] Render a short outcome per exchange (success totals and damage, including no damage), with original/bonus faces in expandable “Roll details”. Keep Attack/Run and victory acknowledgment above details. Add read-only “Character” details after primary commands containing attributes, skills, derived stats, and melee pools; no resource controls. Escape/format only numeric roll data, use derived Health caps, and update iteration label to 03. Do not change the existing busy/focus/pointer gates.
- [x] Extend mobile tests at 320×568, 390×844, and 844×390, including the accepted 18px monospace regression. Assert closed primary commands fit and remain at least 48×48; open the maximum bonus-dice details and assert text is reachable, no horizontal document overflow occurs, and commands remain usable. Retain screen-reader status feedback without repeatedly announcing the full dice list.
- [x] Exercise rapid taps, held pointer/Space across the command lock, blur/focus, source-changing storage events, and blocked v4 migration writes with deterministic rolls. Keep existing camera, map, placement, and legacy-save regressions; update only format/rule expectations.
- [x] Run `npm run typecheck`, `npm test`, and the complete `npm run test:e2e`; expect all pass. When Windows server teardown requires it, start a tracked local preview session first, reuse it in Playwright, then stop that owned session. Commit as `feat: show character and combat roll feedback on phones`.

### Task 5: Verify, review, and hand off

**Files:** Modify `README.md`; address review findings only in their owning files/tests.

**Interfaces:** Consumes all preceding deliverables and the approved design; produces a verified native branch and draft PR for owner acceptance.

- [x] Document fixed starter values, nonchaining bonus dice, ties/margin damage, deferred resource spending/progression, v4 upgrades, and manual acceptance: inspect character; observe misses/damage/bonus dice; win/flee/lose/restart; Continue; verify phone controls.
- [x] Run `npm run typecheck`, `npm test`, and `npm run test:e2e` against the final code; record actual results. Inspect the diff for unrelated changes, persisted transient state, new dependencies, and remaining old Health/damage copy.
- [x] Use the executing-plans/requesting-code-review workflow for one fresh independent whole-branch reviewer, providing the approved spec, this plan, base revision, and exact test evidence. Fix actionable findings and rerun affected checks; rerun the full suite only if changes warrant it.
- [x] Commit documentation, push a `codex/iteration-3` branch, and create/attach a draft PR with rules, migration behavior, validation evidence, and owner acceptance steps. Do not deploy or merge without owner direction.
- [x] Stop owned preview/test servers and report the PR plus any remaining manual acceptance work. Preserve both planning documents in the branch.

## Plan self-review

The five tasks cover the approved fixed build, dice rules, opposed turn flow, feedback, persistence, and regression acceptance. Historical and current Health validation are separated; all cross-task names above agree. Each Review Focus item has explicit tests in its owning task. The owner approved this plan; native implementation, independent review fixes, and verification are complete. The owner accepted the separately deployed Iteration 3 candidate and authorized integration through PR #4 on 2026-11-17.
