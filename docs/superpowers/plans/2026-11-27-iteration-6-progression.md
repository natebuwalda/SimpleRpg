# Iteration 6: Player Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use the established native workflow with one independent whole-branch review.

**Goal:** Give each character a repeatable route to gain levels and spend advancement points within their saved adventure.

**Architecture:** Keep a pure advancement rules module, a fixed creation build, and a separate record of earned improvements. Keep map geometry and original slime placements as the Restart baseline, while the current wave supplies live encounters. Upgrade each v6 roster once and preserve the existing locked, revision-checked transaction boundary for saves.

**Tech Stack:** Existing TypeScript, Phaser, Vite, Vitest, Playwright, localStorage and Web Locks.

**Spec:** `docs/superpowers/specs/2026-11-27-iteration-6-progression-design.md` (owner approved).

## Global constraints

- Start at level 1, award 1 XP per won slime encounter and grant one bankable advancement point per level. Initial cost is 5 XP from every level. One shared function supplies the cost to both award logic and the UI. Carry excess XP.
- Each point increases one Attribute or Skill by exactly 1. No level or creation-rating gate after creation. Keep strict creation budgets and rating cap of 5 at creation.
- **Find more slimes** works only in exploration with zero living encounters. Spawn three distinct walkable placements on the same map, excluding the hero and original spawn; prior wave tiles can be reused.
- Store the victory, XP and completed encounter in one checkpoint. Preserve per-slot revision checks and separate main and acceptance namespaces.
- If progress is dirty, require successful **Retry save** before Spend, Find or Restart. Spend and Find succeed in the UI only after saving. Preserve existing volatile gameplay and discard warning.
- Restart retains earned level, XP and all investments, resets the hero to spawn at derived full Health, and restores the original three placements. Victories following Restart can award XP again.
- Carry forward valid Iteration 5 rosters without retroactive XP. Preserve slot identity, order, revision, defeated status, map, position, Health and completion. Ignore saves older than v6. Present invalid new data must not trigger older fallback.
- Keep existing combat rules, slime stats, movement, camera, ten slots, and phone and keyboard behavior. No new dependencies or hosting changes. Finish with a verified draft PR; deployment and merge remain separate.

## Review focus

1. An autosave failure after multiple victories or at defeat cannot drop earned XP through Spend, Find, or Restart (Tasks 2–4).
2. Repeated activation, reload after victory, and competing tabs must not duplicate XP, points, or a new wave (Tasks 2–4).
3. A v6 roster containing active, cleared and defeated characters upgrades without rerolls, lost progress, or writes crossing namespaces. A newer saved roster wins even if an older tab writes again (Task 2).
4. A starting rating of 5 can reach 6. Tampered point budgets, unsafe numbers, and invalid current or baseline placements are rejected, while post-creation builds still round trip (Tasks 1–2).
5. Keyboard access and small-screen controls remain usable after repeated spends, a level-up, and the transition from the peaceful clearing into a fresh wave (Tasks 3–4).

## File responsibilities and contracts

- New `src/game/progression.ts`: `Progression = { level: number; xp: number; investments: CharacterRatings }` with zero-based investments and `xp` representing progress toward the next level. Export `SLIME_XP = 1`, `xpToNextLevel(level: number): number`, `createProgression(): Progression`, `awardXp(progress: Progression, amount: number, cost?: (level: number) => number): Progression`, `availablePoints(progress: Progression): number`, `effectiveCharacter(base: Character, progress: Progression): Character`, and `spendPoint(progress: Progression, rating: Rating): Progression`. `Rating` is a discriminated pair of `group: 'attributes' | 'skills'` and a key from that group. Unspent points equal level minus one minus invested points. Reject invalid inputs without changing state. Require safe integer counters, investments, totals and derived values. Leave later changes to the handling of partial XP to a future release.
- `src/game/types.ts` and `world.ts`: checkpoint v6 extends the v5 fields with `progression: Progression` and `initialSlimes: SlimePlacement[]`. Keep `character` as the creation build and `world.slimes` as the current wave. Export `restartCheckpoint(checkpoint: Checkpoint): Checkpoint` and `findMoreSlimes(checkpoint: Checkpoint, rng?: RandomSource): Checkpoint`. An ineligible wave request returns the input unchanged. Valid requests replace current placements and clear completion; baseline, geometry, position, Health and progress stay intact.
- `src/game/session.ts`: battle and victory use `effectiveCharacter`; award XP only when transitioning to victory for a living encounter. Clear existing transient roll feedback as before when leaving victory. Use `restartCheckpoint` in the pure Restart path. Deliberate Spend/Find mutations belong to the durable store, with decisions taken from the latest checkpoint under lock.
- `src/game/roster.ts`, `save.ts`, `save-keys.ts`, `save-validation.ts`: roster envelope v7 and matching production/acceptance keys. Freeze v6 roster and v5 checkpoint decoding for upgrade. Expose `parseCheckpoint` for current v6, `parseRoster` for v7, and `upgradeRoster(raw: string | null): RosterSave | null` for legacy v6. Extract shareable placement validation so the baseline uses the same rules as the current wave without checking the hero against inactive baseline tiles. Validate current HP against effective maximum and position against current living slimes. `loadRoster` reads v6 only if v7 is absent and reports the source of a recognized upgrade separately from current, empty, invalid, and unavailable data.
- `src/game/roster-store.ts`: add commands `upgrade`, `findMoreSlimes { id, expectedRevision }`, and `spendPoint { id, expectedRevision, rating: Rating }` to the existing transaction API. Add `newWaveRandom?: RandomSource` to the injectable dependencies. Under the same existing namespace lock, upgrade the latest v6 bytes only if v7 is still absent. A valid in-memory upgrade may be read or played with the save warning if promotion is blocked. The first successful mutation may publish the upgraded roster and the mutation together; every mutation must re-read its latest source under lock. Reset an invalid legacy source by writing valid empty v7 under the same confirmed source/raw guard used for invalid current data. Never modify legacy bytes.
- `src/main.ts`, `src/view/ui.ts`, `src/view/roster.ts`, `src/style.css`: dispatch durable exploration-only Spend/Find with selected ID and revision. Restart from defeat requires clean progress. On success apply the saved checkpoint without re-entering the map or resetting the viewport for Spend/Find. Use existing dirty, stale, pending and save status state. Show XP gained and level gained on Victory and show level, XP/cost and available points in the character sheet. Roster View stays read-only. Preserve sheet expansion and usable focus after spending; use a persistent announcement for the resulting rating and available points.

## Task 1: Progression rules, encounters, and session

**Files:** `src/game/progression.ts`, `types.ts`, `world.ts`, `session.ts`; `tests/progression.test.ts`, `tests/session.test.ts`, `tests/slime-generation.test.ts`, fixtures.

- [ ] Write failing rules tests for no level at 4 XP, level 2 and one point at 5, banked points after multiple levels, distinct attribute/skill spends, Combat 5 → 6, and insufficient/invalid spends. Test a curve with costs 3 then 6, awarding 10 XP from level 1 to reach level 3 with 1 XP toward the next level.
- [ ] Write failing session and world tests for exactly one XP per victory, unchanged XP on Run/defeat/acknowledgement, advanced combat pools and derived Health, and a peaceful clearing spawning exactly three valid positions only on request. Verify Restart restores baseline placements from a later wave and preserves progression.
- [ ] Run targeted Vitest tests and verify failures for the missing behavior.
- [ ] Implement the pure contracts and update fixtures to supply the new fields. Keep creation validation independent. Temporarily allow the old save adapter to round-trip the new checkpoint until Task 2 swaps envelopes; do not fabricate progression from the creation build.
- [ ] Run targeted Vitest tests and typecheck, then commit the green rule/session changes.

## Task 2: Save upgrade and guarded transactions

**Files:** `src/game/save.ts`, `save-keys.ts`, `save-validation.ts`, `roster.ts`, `roster-store.ts`; existing save/store tests plus `tests/progression-save.test.ts`.

- [ ] Write failing tests upgrading a mixed v6 roster with active, cleared and defeated slots. Check exact preserved fields and level 1/0 XP, absent-only fallback, invalid-source reset, no cross-namespace reads, no overwrite of v6, and stale v6 writer behavior after v7 is saved. Exercise failed promotion and recovery under the shared lock.
- [ ] Write failing store tests for two tabs spending or finding with the same revision, malformed investments, insufficient points, invalid placement and Health, failed writes, stale/deleted slots and Restart preserving advancement. Check other slots remain byte-equivalent after successful mutations.
- [ ] Verify regular autosave accepts legitimate missed-save progress for multiple newly defeated slimes in the same wave, with exactly the XP that the added completions earn. Reject lost completions, changes to base build, wave, baseline or investments, and XP mismatches. Retry writes the staged checkpoint and earns no XP again.
- [ ] Observe failing targeted tests. Implement versioned validation, migration and command-specific transactions. Keep counters and checks under the same lock, derive spending and wave results from the stored checkpoint, and make current-key reset durable. Remove the temporary adapter.
- [ ] Run targeted tests, full unit suite and typecheck. Commit the verified persistence layer.

## Task 3: Player-facing progression

**Files:** `src/main.ts`, `src/game/types.ts`, `src/view/ui.ts`, `src/view/roster.ts`, `src/style.css`, `e2e/helpers.ts`, new `e2e/progression.spec.ts`.

- [ ] Add failing browser scenarios with deterministic encounters: win three battles and see 3/5 XP, resume the peaceful map, choose Find, win twice, see level 2 and one point, spend it on a rating of 5, then reload the same slot. Set another character aside and verify its build and XP are independent.
- [ ] Add failing storage scenarios for an unsaved victory and an unsaved defeat. Verify Spend/Find/Restart guard before and after retry. Force a write failure on a clean Spend and Find; verify points and placements stay untouched, then retry successfully.
- [ ] Run the targeted browser tests and see the missing UI and guards fail.
- [ ] Wire the shared contracts, mount the actions on exploration and advancement readouts on the existing sheets, and announce rewards through the existing feedback regions. Use effective stats and melee pools everywhere the game displays or consumes them. Enter as a migrated slot only after observing its latest state. Change edition to 06.
- [ ] Update helpers and existing browser assertions for the v7 envelope. Keep deterministic gameplay fixtures, and exercise legacy v6 only in upgrade scenarios. Run typecheck, unit and targeted browser suites, then commit the verified UI.

## Task 4: Regression verification and handoff

**Files:** `e2e/progression.spec.ts` and affected browser suites, `scripts/verify-deployment.mjs`, `README.md`, `docs/superpowers/iteration-6-status.md`.

- [ ] Test at least one real shared-context competing mutation, repeated Find activation, reload at the fifth victory, persisted new placements, and Restart after a later-wave defeat. Confirm that a dirty multi-win recovery commits all XP exactly once. Verify 320 × 568, 390 × 844, and 844 × 390 with large text, keyboard sheet navigation, focus after spend, and touch control reachability.
- [ ] Update the README with the shipped Iteration 5 baseline, the Iteration 6 rules, existing-save upgrade and old-tab refresh note, and a short phone acceptance checklist. Update the deployment verifier to support Iteration 5 production alongside Iteration 6 acceptance and both paths on Iteration 6. Check namespace isolation and run a deterministic progression smoke flow.
- [ ] Run typecheck, unit and full browser suites, production and acceptance builds, and git diff whitespace checks. Smoke-test the combined local site and record actual evidence; stop local test servers after verification.
- [ ] Conduct one independent whole-branch review against the design and five Review Focus cases. Reproduce actionable findings, address them in one fix pass, and rerun relevant verification.
- [ ] Commit verified changes, push `codex/iteration-6`, open and attach a draft PR targeting main, and verify final-head CI.
