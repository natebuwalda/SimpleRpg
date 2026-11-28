# Iteration 12 Cleric and Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal** — Add the Cleric with Melee, Heal, Smite, and Run, and make Current Resources persist across encounters.

**Architecture** — Resolve both resource actions in the existing turn loop and transfer the resulting Resources into the same checkpoints that carry Health and XP. Update the class metadata and UI to show the four commands and use the locked roster upgrade for existing saves.

**Tech stack** — TypeScript, Vite, Phaser, Vitest, Playwright Chromium, and GitHub Pages.

**Spec** — [Approved Cleric and Resources design](../specs/2026-11-27-iteration-12-cleric-resources-design.md).

## Global constraints

- Cleric Melee uses Prowess + Combat, and Defense uses Resistance + Combat. Keep Run and the other classes' behavior.
- Maximum Resources is effective Cunning + Resistance. New Game and Restart initialize Current Resources to half, rounded up. Victory, escape, and advancement carry the current amount forward.
- Heal and Smite roll effective Resistance + Lore unopposed using existing d10 rules and the 1,024-dice ceiling. Heal restores one HP per success up to pre-spend Resources and missing HP, then spends one. Smite deals one direct damage per success up to pre-gain unused capacity, then restores one.
- Resource changes occur on a resolved action even on zero successes. Heal is allowed at full Health if Resources remain. Heal at zero or Smite at full Resources consumes no turn or dice.
- Write roster v11/checkpoint v10 with Current Resources for Clerics only. Keep separate production and acceptance save namespaces.

## Review focus

- Calculate each action's cap from the old Resource balance. Missing HP also limits Heal. A zero-success action still changes the balance by exactly one.
- Earlier defeat prevents the chosen action and resource change. A lethal Smite restores its Resource and skips the later slime attack.
- A failed autosave retains the updated Health and Resources together in memory. Retry writes both without adding a second Resource or XP reward.
- Maximum Resources can increase through advancement. The current amount carries forward, and Restart computes its midpoint from the new maximum.
- A valid pre-Cleric roster upgrades without changing classes, progress, or adventure data. A malformed newest save blocks fallback. Four combat controls fit on narrow phones and retain pending-input protections.

## Task 1 — Class actions and turn resolution

**Files** — `src/game/combat-actions.ts`, `src/game/types.ts`, `src/game/battle.ts`, and `tests/cleric.test.ts`.

**Interfaces** — Add `'cleric'` to `ClassId` and `'heal' | 'smite'` to `ClassAction`. Use a `classActions` list in class metadata so the Cleric has both actions. Add `getClericPool(ratings: CharacterRatings): number`, and `startingResources(maxResources: number): number` for half rounded up. Extend `BattleClassAction` with `{ kind: 'cleric'; pool: number; maxHp: number; maxResources: number; currentResources: number }`. Extend `createBattle` with a fifth optional `currentResources` argument. Add ordered turn entries `{ kind: 'heal' | 'smite'; roll: PoolRoll; amount: number; currentResources: number }`. Keep `canUseCombatCommand` as the shared eligibility check.

- [ ] Write and run failing unit tests. With 5 Maximum and 3 Current Resources, verify Heal grants at most 3 HP and leaves 2, and Smite deals at most 2 damage and leaves 4. Add tests for missing HP, full Health, zero successes, an original 10's bonus, maximum roll size, and advanced Resistance and Lore.
- [ ] Test both resource bounds and wrong-class commands without RNG. Script an earlier lethal slime hit and confirm no Cleric action or resource change. Script lethal Smite and confirm the resource gain and that no later slime attack occurs. Check Melee and Run keep the pool.
- [ ] Implement and run `npx vitest run tests/cleric.test.ts tests/rogue.test.ts tests/momentum-nuke.test.ts`. Use the existing round loop, resolver and dice helpers. Integrate Tasks 2 and 3 before committing the runtime change.

## Task 2 — Checkpoints and roster upgrades

**Files** — `src/game/types.ts`, `world.ts`, `session.ts`, `save.ts`, `save-keys.ts`, `roster.ts`, `roster-store.ts`, current fixtures, and `tests/cleric-save.test.ts`.

**Interfaces** — Add `currentResources?: number` to checkpoint v10. Require it for Cleric and omit it for other classes. Read v11 first, then v10 through v6 only when the newer key is absent. Write only v11. Use the effective character to validate the integer range `0..resourceCapacity`.

- [ ] Write and run failing save tests for odd and even starting pools, earned Cunning or Resistance increasing maximum without topping up, and Restart applying the new midpoint. Verify prior roster v10 migrates with IDs, revisions, status, class, progress, and placements intact. Keep source bytes untouched. Reject out-of-range, fractional or missing Cleric Resources, Cleric in old formats, and corruption at the newest key.
- [ ] Initialize Resources in checkpoint creation and Restart, pass them into the encounter, and write the resolved amount into the victory or escape checkpoint. Leave the safe checkpoint in place during active battle and defeat. Continue using existing locked, revision-checked autosaves and retries. Test a failed Cleric save followed by retry and reload, verifying Health, Resources, and XP are written together.
- [ ] Update current fixtures while keeping historical fixtures on their original versions. Run `npm run typecheck` and `npm test`.

## Task 3 — Display and release verification

**Files** — `src/view/ui.ts`, `character-creation.ts`, `roster.ts`, `class-action.ts`, `src/style.css`, `e2e/cleric.spec.ts`, affected browser fixtures, `scripts/verify-deployment.mjs`, and `README.md`.

**Interfaces** — Use `Heal`, `Smite`, and `Resources` as visible labels. Show the current and maximum values together, such as `3 / 5 Resources`. Display which Resource bound disables an action. Show dice, healing or damage, and the resulting Resources in resolution order.

- [ ] Write and observe failing browser cases for Cleric creation, reaching a resource bound, enabled and disabled commands, victory or escape with the altered balance, and Resume. Cover a repeated Heal or Smite input and all four controls at 320×568, 390×844, and 844×390. Exercise a pre-Cleric save upgrade and current save failure and retry.
- [ ] Add the UI and guard integration. Present the Cleric's four actions in two rows on narrow phones as needed. Show Resources during exploration, combat, and roster review, and describe both actions during creation. Keep the ordered announcements, focus restoration, and disabled-state behavior.
- [ ] Set `ITERATION 12`. Update the README and smoke verifier. Support Iteration 11 on main and require Iteration 12 on acceptance. Verify a deterministic Cleric Heal and Smite sequence and resource persistence while retaining previous action, wave, XP, and save-isolation checks.
- [ ] Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `git diff --check`. Smoke-test local 11/12 and 12/12 layouts and stop the test servers. Run one independent whole-branch review, address material findings, open a draft PR, and verify final-head CI before acceptance handoff.
