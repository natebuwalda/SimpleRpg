# Iteration 7: Slime Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Continue the selected native workflow with one independent whole-branch review.

**Goal:** Make each new slime wave harder and more rewarding while preserving player progression and the Restart safety valve.

**Architecture:** Put slime stats and rewards in one pure rules module. Save one slime level per checkpoint and change it only inside the existing Find and Restart operations. Battle, victory feedback and autosave validation all use that wave's rules.

**Tech Stack:** Existing TypeScript, Phaser, Vite, Vitest, Playwright, Web Locks and localStorage.

**Spec:** `docs/superpowers/specs/2026-11-27-iteration-7-slime-levels-design.md` (owner accepted).

## Global constraints

- Start new adventures at slime level 1 with three slimes, each with 3 Health, 3d10 Attack, 3d10 Defense and a 1 XP reward. At slime level L, Health and both pools are L + 2 and the reward is L XP.
- Only a successful **Find more slimes** on an empty clearing advances the wave. Spawn three distinct walkable placements on the same map away from the hero and original spawn. Reload preserves the wave and placements.
- Restart restores the original level 1 wave, completion, spawn and full derived Health. Player levels, XP, investments and unspent points survive.
- Existing roster saves preserve player progress, current encounters, original placements, status and slot identity. Slimes start at level 1 after upgrade and award XP on future victories.
- Save wins and XP together. Keep namespace isolation, per-slot revision checks, dirty-progress guards and retry behavior. Retain the existing player level curve, combat rules and map behavior.
- The recorded dice limit is 1,024 per pool, making slime level 1,022 the last supported wave. At a fully cleared final wave, explain that there are no higher waves and omit Find.
- Use existing desktop and phone UI patterns and dependencies. Deliver a verified draft PR on `codex/iteration-7`. Deployment and merge stay separate.

## Review focus

1. Multi-win retry at a boosted wave must award the full scaled XP exactly once, even when one victory gives multiple player levels (Tasks 1–3).
2. A failed or stale Find never changes slime level or placements; competing accepted operations can advance the same revision only once (Tasks 2–3).
3. Upgrading a later Iteration 6 wave preserves both sets of placements and completion, even though its new level starts at 1. An invalid newer key must not resurrect an older save (Task 2).
4. Reloading a higher wave and restarting after defeat exercise two different outcomes. Reload restores the current wave, while Restart restores the original level 1 wave and preserves all player advancement (Tasks 1–3).
5. The last wave must stay playable and clearable without exceeding dice bounds or offering a broken action. Higher-wave readouts and controls must fit the smallest phone view (Tasks 1–3).

## Interfaces and file responsibilities

- New `src/game/slime.ts`: export `FIRST_SLIME_LEVEL = 1`, `MAX_SLIME_LEVEL = MAX_MELEE_POOL - 2`, `isSlimeLevel(value: unknown): value is number`, and `slimeStats(level: number): { maxHp: number; attack: number; defense: number; xp: number }`. Validate stored levels as integers in the supported range. Replace fixed `SLIME` and `SLIME_XP` references with these rules.
- `src/game/types.ts`, `battle.ts`, `session.ts`, `world.ts`: checkpoint v7 adds mandatory `slimeLevel: number`. `createBattle(heroHp, character, slimeLevel = FIRST_SLIME_LEVEL)` records `slimeLevel` in transient battle state. Resolve each turn using its level and award the corresponding XP only on a living encounter's victory. Include `xpAwarded` on victory state for both visual and live feedback. `createCheckpoint` and `restartCheckpoint` set level 1. Export `canFindMoreSlimes(checkpoint: Checkpoint): boolean` for current level below the cap and zero living encounters. `findMoreSlimes` returns the unchanged checkpoint if ineligible.
- `src/game/save.ts`, `save-keys.ts`, `roster.ts`, `roster-store.ts`: write roster v8. Decode matching envelope/checkpoint pairs v8/v7, v7/v6 and v6/v5. Read v8, then v7, then v6 only when the newer key is absent. Each legacy decoder sets wave level to 1. Preserve v7's progression and initial placements; retain Iteration 5's upgrade defaults. Track the exact observed source version for confirmed resets and upgrades, plus the raw payload guard for reset, so identical bytes at different fallback keys cannot reuse a confirmation. Publish v8 under the same version-independent namespace lock. Ordinary autosaves require unchanged wave level and placements. Award validation uses completion delta multiplied by `slimeStats(previous.slimeLevel).xp`. Only Find and Restart change the wave level.
- `src/main.ts`, `src/view/ui.ts`, `src/view/roster.ts`, and `src/style.css`: thread the exact reset source through existing callback handling. In exploration show **Slime level** and the existing remaining count. Battle shows the actual enemy level, maximum Health and defense pool, and uses the actual earned XP in victory feedback. Announce any resulting player level via the existing live region. Find stays governed by current dirty, pending and stale handling. At the cap use a short peaceful-clearing message when no living slimes remain. Set edition 07 and keep narrow-screen focus and reachability.

## Task 1: Slime rules, wave transitions, and combat

**Files:** `src/game/slime.ts`, `types.ts`, `battle.ts`, `world.ts`, `session.ts`, `progression.ts`, affected view and save call sites, and focused tests in `tests/slime-levels.test.ts`.

- [x] Write rule tests for levels 1, 2, 3, 1,022 and invalid levels. Verify level 2 initializes at 4 Health and uses 4 dice on both opposing rolls, with deterministic faces and death on a lethal strike.
- [x] Write checkpoint/session tests for clearing level 1 and finding level 2, finding again while a slime lives, blocked Find at the highest level, Restart after a boosted wave, and unchanged player progress on defeat. Verify a level 11 slime victory with the player at 4/5 XP grants three player levels, three points and 0 carried XP.
- [x] Run the focused tests and verify the failures show absent scaling or wave behavior.
- [x] Implement the pure rules and integrate in world/session/battle. Keep the baseline call sites working during this task, then remove fixed reward and combat constants once Task 2 and Task 3 switch their consumers.

## Task 2: Durable wave updates and save upgrades

**Files:** `src/game/save.ts`, `save-keys.ts`, `roster.ts`, `roster-store.ts`, reset-source call sites, `tests/slime-level-save.test.ts`, current save tests and fixtures.

- [x] Write failing upgrade tests for v7 with a later wave and points, for v6 compatibility, and for invalid v8 or v7 blocking fallback. Check current and baseline placements, XP, defeat and completion. Check namespace isolation and distinct reset source identities.
- [x] Write failing transaction tests for failed and retried Find, competing Find against the same slot revision, cap rejection, and a two-win autosave at slime level 3 requiring exactly 6 XP. Check invalid level, a valid-but-changed level in an autosave, and duplicate reward retries. Verify a stale operation cannot change another slot.
- [x] Run the focused save tests and confirm failures.
- [x] Implement v8 decoding, upgrade and writer changes and the shared Find/Restart and XP rules. Update old fixtures to current v8/v7 except where deliberately testing legacy behavior. Run typecheck and the full unit suite. Commit the working rules and persistence slice together so the public checkpoint shape and writer agree.

## Task 3: UI, browser regressions and draft PR

**Files:** `src/main.ts`, `src/view/ui.ts`, `src/view/roster.ts`, `src/style.css`, `e2e/slime-levels.spec.ts`, affected e2e helpers, `scripts/verify-deployment.mjs`, `README.md`, and status doc.

- [x] Add failing browser tests for level 2 stats/readout, a 2 XP victory, reload retaining the wave, and a higher-wave defeat resetting to level 1 with identical player progression. Exercise failed Find plus retry, a real two-tab race, and unavailable Find after clearing the cap. Adjust the existing five-win progression scenario because the fourth victory now grants 2 XP on wave 2.
- [x] Run targeted browser tests and confirm the missing UI fails. Implement the readouts and announcements, wire exact save-source confirmation identity, and check reachability and focus at 320 × 568, 390 × 844 and 844 × 390. Run targeted suites.
- [x] Update the release verifier to require Iteration 7 on acceptance and support Iteration 6 on production. Add a deterministic higher-wave victory and reload check. Update release docs and phone acceptance steps.
- [x] Run typecheck, unit and full browser suites, builds, and whitespace checks. Smoke-test the combined local 06/07 and 07/07 packages with distinct save namespaces and stop owned test servers.
- [x] Review the complete branch independently against the accepted design and Review Focus. Fix material findings with regression evidence, rerun relevant checks, and commit.
- [ ] Push the branch, open and attach a draft PR against main, and verify CI for the final commit.
