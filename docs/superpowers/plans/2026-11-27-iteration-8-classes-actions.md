# Iteration 8: Classes and Combat Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Continue the native workflow with one independent whole-branch review.

**Goal:** Let new players choose Warrior or Wizard and use their class's offensive action with the existing combat rules.

**Architecture:** Define the two offensive actions separately from the class assignments. Store a permanent class in each character's starting build, derive its active combat pools from effective ratings, and validate the chosen action before any dice roll.

**Tech Stack:** Existing TypeScript, Phaser, Vite, Vitest, Playwright, Web Locks, and localStorage.

**Spec:** `docs/superpowers/specs/2026-11-27-iteration-8-classes-actions-design.md` (owner accepted).

## Global constraints

- Warrior uses Melee, Prowess + Combat. Wizard uses Magic, Prowess + Lore. Both can Run and defend with Resistance + Combat.
- Keep the opposed d10 rules, slime defenses and counterattacks, victory healing, XP, wave scaling, defeat, and Restart. Apply the 1,024-dice ceiling to each pool a class actually uses.
- Require a class in the first creation step. Keep the selected class while navigating the draft, show it on review and character details, and preserve both point budgets and all legal starting allocations.
- Upgrade all supported older characters as Warriors and preserve the rest of their progress. Class is permanent. Writes retain namespace separation, Web Locks and slot revision checks.
- Keep accessible inputs and touch controls at 320 × 568, 390 × 844, and 844 × 390. No resources, cooldowns, class trees, specializations, extra targeting, loot, or inventory.
- Deliver a verified draft PR on `codex/iteration-8`. Deployment and merge stay separate.

## Review focus

1. A disallowed or stale combat command spends no turn, consumes no randomness and cannot bypass the action guard (Tasks 1 and 3).
2. Wizard Lore boosts Magic, Warrior Lore has no melee effect, and Combat still raises both classes' defense (Tasks 1 and 3).
3. Existing higher-wave saves retain level, advancement, encounters and original placements while loading as Warriors. A damaged newest save must not fall back silently (Task 2).
4. A Wizard's effective Magic pool and shared defense each honor the dice bound, including after a spend. Inactive hypothetical pools do not invalidate legitimate builds (Tasks 1 and 2).
5. A class choice survives Back and a failed save, and keyboard or touch repetition still produces exactly one combat turn (Task 3).

## Shared interfaces

- New `src/game/combat-actions.ts`: define `OffensiveAction = 'melee' | 'magic'`, `CombatCommand = OffensiveAction | 'run'`, and the action metadata containing label and attack skill. Define `ClassId = 'warrior' | 'wizard'`, class label and assigned offense in a separate class table in the same module. Export `isClassId(value: unknown): value is ClassId`, `offenseFor(classId: ClassId): OffensiveAction`, and `getCombatPools(ratings: CharacterRatings, action: OffensiveAction): { attack: number; defense: number }`. Keep metadata free of UI state. Use a type-only import of `CharacterRatings`.
- `src/game/character.ts` and `creation.ts`: add required `classId: ClassId` to `Character`. `createStarterCharacter` returns a Warrior. `CharacterDraft = Omit<Character, 'classId'> & { classId: ClassId | null }`; initialize it with null. Point allocation and budget helpers work on the draft. `finishCharacter(draft)` requires a valid class and still trims and copies the starting build.
- `src/game/battle.ts`, `types.ts`, and `session.ts`: `createBattle` derives the offense and its pools from the effective character and records the permitted offensive action in battle state. `resolveTurn(state, command: CombatCommand, rng?)` returns the original state for an unavailable action before invoking RNG. Session accepts Melee, Magic, or Run only while battling, and returns the original state if the turn resolver does. Remove the generic Attack command. Use one shared combat-command predicate for input guards where appropriate.
- `src/game/progression.ts`, `save.ts`, and `roster-store.ts`: `effectiveCharacter` carries `classId` from the base character. `hasSupportedCombatPools(character: Character)` checks the assigned offensive pool and shared defense. Use it for save decoding, the spending transaction, and availability of spend controls. Keep the existing immutable starting-build comparison, including class.
- `src/game/save-keys.ts`, `save.ts`, `roster.ts`, and reset callers: roster v9 stores checkpoint v8. Keep the legacy pairs v8/v7, v7/v6 and v6/v5. Assign Warrior before validating each legacy build. Require a valid class on current saves. Preserve slime level for checkpoint v7 and v8 and existing defaults for older checkpoints. Observe v9 first, then v8, v7 and v6 only when the preceding key is absent. Carry the exact legacy key version through reset.
- `src/view/character-creation.ts`, `src/view/ui.ts`, `src/view/roster.ts`, `src/main.ts`, and `src/style.css`: labeled Warrior/Wizard selection in the existing first step with accurate pool preview once selected. Keep role and skill guidance concise. Show the class in review and both character sheets. Label the attack pool with its action. Map both offensive commands and Run to the same pointer, keyboard, visibility, and pending-turn protections. Set edition 08.

## Task 1: Class rules and combat integration

**Files:** `src/game/combat-actions.ts`, `character.ts`, `creation.ts`, `progression.ts`, `battle.ts`, `session.ts`, `types.ts`, and relevant unit tests.

- [ ] Add focused failing tests for identical ratings with different offenses, Combat defense parity, a Wizard's increased Lore affecting Magic, and unchanged Warrior behavior. Freeze the RNG and verify unauthorized Magic/Melee returns the same state and calls RNG zero times. Use the same dice result with a living or defeated slime to check tie and lethal behavior. Add a creation test for skipped and invalid classes.
- [ ] Run the focused suites and observe the missing behavior. Implement the class and action contracts with the shared resolver and update baseline fixtures. Run the focused tests again. Integrate Task 2 and the UI call sites before committing if the old save or command shape would otherwise leave the branch unrunnable.

## Task 2: Migration and progress safety

**Files:** `src/game/save-keys.ts`, `save.ts`, `roster.ts`, `roster-store.ts`, class-aware pool validation, `tests/class-save.test.ts`, and versioned fixtures.

- [ ] Add failing tests for Warrior migration of a v8 Wizard-free save with a higher wave, invested points, and partial completion. Verify v7 and v6 fallback and unchanged revision, identity, and namespaces. Check that a malformed newest key blocks fallback and that current saves reject absent or unknown class IDs.
- [ ] Test that a current Wizard keeps their class on Restart, that a stale update cannot switch a class, and that over-limit Magic or defense fails validation and spending. Verify a build at exactly 1,024 dice remains valid and that a Warrior with high Lore can still load when the actual pools are safe.
- [ ] Run the migration tests to confirm the failures. Implement the v9 writer and legacy readers and migrate current fixtures. Run typecheck and the full unit suite once all call sites use the updated shape.

## Task 3: Creation, battle UI and release handoff

**Files:** creation, adventure and roster views, main dispatch, responsive styles, `e2e/classes.spec.ts`, affected fixtures, `scripts/verify-deployment.mjs`, README and an Iteration 8 status note.

- [ ] Add browser regressions for explicit class choice, keeping it through Back and a failed Begin save, and checking the chosen attack pool. Run them to observe the missing UI. Add human-visible tests that an upgraded Warrior sees Melee and a new Wizard sees Magic, the Wizard's Magic improves with a Lore point, and the class and action survive reload and Restart.
- [ ] Implement the UI and command guard integration. Adapt existing Attack tests to Melee and cover repeat Magic input. Verify the first step, review, and battle controls at each supported phone size and with keyboard focus. Run the targeted suites.
- [ ] Update the deployment verifier to require Iteration 8 on acceptance, support Iteration 7 on main, and exercise both classes on Iteration 8. Treat the class control and action labels as edition-specific in shared helpers so the prior release can still be smoke tested. Update the README and acceptance instructions.
- [ ] Run typecheck, full unit and browser suites, builds and whitespace checks. Smoke test both local 07/08 and 08/08 packages, including namespace isolation, and stop the owned test servers.
- [ ] Run one independent whole-branch review against the design and Review Focus items. Reproduce material findings, fix them in one pass, and rerun affected checks. Commit, push, open and attach a draft PR, then follow final-head GitHub CI.
