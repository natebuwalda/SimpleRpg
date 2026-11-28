# Iteration 14 Cumulative XP Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for native execution. Track the work using the checkboxes below.

**Goal** — Give new characters the cumulative XP thresholds and preserve the original curve for existing characters.

**Architecture** — Store a curve identifier beside the existing level, XP remainder, and investments. Use one curve calculation for combat rewards, locked save validation, and both character displays.

**Tech stack** — TypeScript, Vite, Vitest, Playwright Chromium, and GitHub Pages.

**Spec** — [Approved cumulative XP design](../specs/2026-11-28-iteration-14-cumulative-xp-design.md).

## Global constraints

- New characters start with the linear curve, which costs 5 × current level to advance. Existing characters keep the flat 5 XP curve. Each level still grants one Attribute or Skill point.
- Retain levels, XP remainder, investments, curve, and adventure data through save, reload, and Restart. Use roster v13 and checkpoint v12. Keep earlier save keys intact and production and acceptance storage separate.
- Keep Iteration 13 slime rewards, waves, stats, combat actions, and advancement spending rules. Victory shows the individual XP award. Character and roster details show lifetime XP.

## Review focus

- A large valid XP award advances through multiple levels without one iteration per level or rounded lifetime XP.
- Old saves use the flat validation rules. New saves require a known curve and a remainder valid for that curve and level.
- A stale or invalid update cannot swap a character’s XP curve or award XP twice. Failed writes can be retried.
- Old and new characters coexist in one roster, including a Restart after defeat. Both character views report the same total and threshold.
- The deployment smoke test supports Iteration 13 at the production root with Iteration 14 at acceptance, and later Iteration 14 at both URLs.

## Task 1 — Award and display cumulative XP

**Files** — `src/game/progression.ts`, `tests/progression.test.ts`, `tests/slime-levels.test.ts`.

**Interfaces** — Export `XpCurve = 'flat-v1' | 'linear-v1'`. Add `curve: XpCurve` to `Progression`. Use `createProgression(curve: XpCurve = 'linear-v1')`, `xpForLevel(level: number, curve: XpCurve): bigint`, and `parseProgression(value: unknown, legacy = false): Progression | null`. Keep the existing result shapes of `awardXp(progress, amount)` and `creditXp(progress, amount)`. Replace the test-only cost callback with explicit curve cases.

- [ ] Add tests for both curves. Assert the linear level 1–6 milestones `[0n, 5n, 15n, 30n, 50n, 75n]`, 14 XP at level 2 with 9 left over, 15 XP at level 3 with zero left over, and 18 XP at level 3 with 3 left over and two points. Sum three victories per wave through wave 10 and assert level 8, 25 XP left over, and seven points. Assert the same run reaches flat level 34. Test that `Number.MAX_SAFE_INTEGER` XP on the flat curve yields level `1_801_439_850_948_199` and remainder `1`. Test that a max-level flat save with remainder `4` credits zero on another win.
- [ ] Run `npx vitest run tests/progression.test.ts` and observe the old flat-only behavior fail the new regression.
- [ ] Add the curve calculation using exact integer thresholds. Let `n` be `level − 1`. Flat uses `5n` and linear uses `5 × n × (n + 1) / 2`. Put the linear multiplier in one named constant. In `creditXp`, find the highest reachable level up to the existing player-level bound by binary search. Keep the current numeric remainder and credit guards. Compute next-level cost by subtracting adjacent thresholds, including when validating a save. Use `progressionSummary(progress)` for `Level 3 · 18 / 30 total XP · 2 points available`.
- [ ] Verify fresh curves in gameplay fixtures and keep explicit flat fixtures where they model migrated data. Run the focused progression and slime-level suites.

## Task 2 — Persist both curves through roster migration

**Files** — `src/game/world.ts`, `src/game/types.ts`, `src/game/save.ts`, `src/game/save-keys.ts`, `src/game/roster.ts`, `src/game/roster-store.ts`, `src/view/ui.ts`, `tests/fixtures.ts`, and current save and roster fixtures.

**Interfaces** — Current roster `version: 13`, checkpoint `version: 12`, and `.save.v13`. Checkpoint versions 5–11 decode as `flat-v1` using their original schema. Only checkpoint v12 reads the curve identifier from persisted progression. New adventures use the default `createProgression()`.

- [ ] Add a migration fixture with an Iteration 13 level 3 character at remainder 3 with an invested point. Verify 13 / 15 total XP, unchanged source bytes, slot identity, adventure data, and revision. Credit 2 XP and verify flat level 4. Create a fresh slot in the same locked store, credit 9 XP by clearing waves 1 and 2, and verify linear level 2 with remainder 4. Assert Restart and reread preserve both curves. Reject legacy remainder 5, unknown or missing current curve, and a locked update that substitutes the other curve with the same level and remainder.
- [ ] Run `npx vitest run tests/progression-save.test.ts` and confirm the coexistence regression fails before the migration changes.
- [ ] Update serialization and the existing locked upgrade path to prefer v13 and then v12–v6 on absence. Keep the existing version-independent lock name and strict behavior when the newest encountered key is invalid. Preserve legacy resource validation. Continue validating claimed victories through `awardXp(previous.progression, ...)`, so a client cannot change the curve through autosave.
- [ ] Update current save fixtures. Strip the new curve field from representative historical fixtures and keep their original versions and keys. Run `npm run typecheck` and `npm test`. Check that the existing retry and concurrent-update tests still pass.

## Task 3 — Verify playthroughs and release support

**Files** — `src/view/ui.ts`, `e2e/helpers.ts`, `e2e/progression.spec.ts`, `e2e/slime-levels.spec.ts`, affected browser fixtures, `scripts/verify-deployment.mjs`, and `README.md`.

- [ ] Add browser coverage for a migrated flat slot and a genuinely new linear slot in one roster. Verify that 5 total XP shows `Level 2 · 5 / 10 total XP` on the flat slot and `Level 2 · 5 / 15 total XP` on the new slot. Compare roster details with the in-game sheet after reload. Exercise a Restart through the defeated slot and verify the curve and threshold remain intact.
- [ ] Update the failed-save browser scenario to assert cumulative XP before and after retry. For the current fixture starting at 4 total XP, two wave-three victories must yield exactly `Level 2 · 10 / 15 total XP · 1 point available`. Use `.save.v13` in current fixtures and keep stored legacy fixtures on their original keys.
- [ ] Set `ITERATION 14` and update the README’s progression and hosting notes. Extend the deployment verifier to require Iteration 14 at acceptance, support Iteration 13 or 14 on main, and assert `Level 2 · 5 / 15 total XP · 1 point available` on a newly created Iteration 14 character. Keep the Iteration 13 combat and storage checks.
- [ ] Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `git diff --check`. Smoke-test local Iteration 13/14 and 14/14 layouts, then stop the test servers. Complete one whole-branch review, address any material findings, and verify final-head CI on the draft PR before acceptance handoff.
