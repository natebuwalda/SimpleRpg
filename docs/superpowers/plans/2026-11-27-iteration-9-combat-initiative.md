# Iteration 9 Combat Initiative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal** — Roll initiative on encounter entry, display turn order before input, and resolve each round in that order.

**Architecture** — Store the ranked initiative results in memory in the existing battle state. Resolve one chosen command and the slime's turn through the same opposed-roll rules and record only the attacks that actually occur, in resolution order.

**Tech stack** — TypeScript, Vite, Phaser, Vitest, Playwright Chromium, and GitHub Pages.

**Spec** — [Approved combat initiative design](../specs/2026-11-27-iteration-9-combat-initiative-design.md).

## Global constraints

- Roll once per encounter using effective Prowess + Cunning for the player and slime level + 2 for the enemy. Cap the rolled pool at 1,024 dice and use the raw score for ties.
- Rank by successes, then raw Initiative, then player over NPC. Reuse the existing d10 success and bonus-die rules.
- Use the existing v9 roster, v8 checkpoint, and separate production and acceptance storage keys.
- Keep the current combat commands, progression, wave rules, and input guard. Rogue and balance changes are out of scope.

## Review focus

- A valid older build with Initiative above 1,024 still loads. Bound the roll and retain the original raw score for ties.
- Walking past or onto a defeated slime consumes no initiative RNG. A fresh encounter after escape rolls again.
- A losing initiative roll cannot cause damage before the player's decision. A lethal opening attack skips the second turn.
- Escape after a nonlethal slime attack persists the lower Health. A lethal slime attack saves defeat and Restart returns at full Health.
- Keyboard and touch inputs keep the existing pending-turn protection with the added Turn Order list. Check both combatant orders and a slime-only defeat log on phone viewports.

## Task 1 — Initiative and ordered combat

**Files** — `src/game/types.ts`, `src/game/slime.ts`, `src/game/battle.ts`, `src/game/session.ts`, `tests/initiative.test.ts`, and existing battle/session fixtures.

**Interfaces** — Use `Combatant = 'hero' | 'slime'`, `InitiativeResult = { combatant: Combatant; rawInitiative: number; successes: number }`, and `TurnOrder = readonly [InitiativeResult, InitiativeResult]`. Add `turnOrder: TurnOrder` to `BattleState`. Represent the round log as `TurnRolls = readonly { attacker: Combatant; roll: OpposedRoll }[]` in resolution order, retaining the existing nullable `lastTurn` state. Extend `createBattle(heroHp: number, character: Character, slimeLevel?: number, rng?: RandomSource): BattleState`. Keep the existing `resolveTurn` and `transition` signatures.

- [ ] Write and run failing initiative tests. With a starter 6-die player against a 3-die slime, script the hero and then the slime roll. Cover a one-success difference, equal successes with different raw scores, and exact equality. Script an original 10 followed by a bonus 10 and assert two successes and exactly one bonus draw. Use higher-wave and invested Cunning fixtures. Assert a valid very-high-Cunning v9 save loads, draws at most 1,024 original player dice, and keeps its raw Initiative for ties.
- [ ] Add slime `initiative` equal to level + 2. In `createBattle`, roll and rank the two combatants using `rollPool`. In `transition`, pass the supplied RNG to `createBattle` only when movement enters a living encounter. Confirm ordinary movement and completed encounters draw zero initiative dice.
- [ ] Add and run failing round tests for both orders. Verify that an earlier lethal hit skips the other attack, a surviving pair produces one log entry per attack in order, and an unavailable class command returns the original state without consuming a die. For Run, verify player-first escape uses zero combat dice, a surviving slime-first hit preserves damage and position, and a lethal slime-first hit ends in defeat. Re-enter after escape and assert a fresh roll.
- [ ] Implement `resolveTurn` using `turnOrder`. Process the chosen action on the player's turn and one opposed attack on the slime's turn. Keep the current XP, healing, completion, and Restart flows in session. Keep transient battle data out of storage. Update older scripted assertions for the new log and set deterministic entry rolls where tests assume player-first.
- [ ] Run `npx vitest run tests/initiative.test.ts tests/battle.test.ts tests/session.test.ts`. Integrate Task 2 before committing the runtime change so all round-log consumers compile together.

## Task 2 — Turn Order display and release checks

**Files** — `src/view/ui.ts`, `src/style.css` if needed for spacing, `e2e/initiative.spec.ts`, `e2e/helpers.ts`, affected browser specs, `scripts/verify-deployment.mjs`, and `README.md`.

**Interfaces** — Read `battle.turnOrder` and the ordered `TurnRolls` from Task 1. Render an ordered list with accessible name `Turn Order` and entries such as `Meadow slime · 2 successes` and `You · 1 success`. Use the actual ordered round log in the visual summary, roll details, and existing live announcement.

- [ ] Write and run failing browser tests. Seed an Iteration 8 v9 save and control the encounter-entry roll before moving onto a slime tile. Assert Turn Order and unchanged Health before the first action. Show the slime first, resolve a round, and confirm the display stays fixed and the summary and dice details list the slime first. Cover both Run outcomes through reload or Restart and a lethal round whose log contains only the slime attack.
- [ ] Render the list before the action buttons. Render only attacks that occurred, in actual order, on battle and end screens. Keep the existing Melee, Magic, and Run input guard, keyboard focus, and announcements. Set the edition to `ITERATION 09` and verify touch controls, readable Turn Order, and repeated input at 320×568, 390×844, and 844×390.
- [ ] Audit deterministic scripts. Set initiative faces before encounter entry and set the attack faces afterward. Do not make initiative order depend on a browser test's natural RNG. Preserve older-edition behavior in the deployment smoke helper.
- [ ] Update the README and deployment verifier. Support Iterations 8 and 9 together, require Iteration 9 on acceptance, assert the Turn Order before combat on Iteration 9, and retain the two classes, higher-wave XP, reload, and save-isolation checks.
- [ ] Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `git diff --check`. Smoke-test local 08/09 and 09/09 builds and stop the test servers. Review the whole branch against the approved design, then commit and open a draft PR. Verify final-head CI before handing off for acceptance.
