# Iteration 4: Character Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Native execution remains selected; use one final independent whole-branch review.

**Goal:** Let players name and allocate a starting character through the approved phone flow, then preserve that build in the existing adventure.

**Architecture:** Keep named-character validation and allocation pure, with checkpoint v5 and strict historical decoders. Mount a transient creation component inside the existing title UI; it emits a completed character only after the current-save overwrite gate. The adventure stores its own copy, and the existing read-only Character disclosure shows the named build.

**Tech Stack:** Existing TypeScript, Phaser, Vite, Vitest and Playwright. No new runtime dependencies or hosting changes.

**Spec:** `docs/superpowers/specs/2026-11-19-iteration-4-design.md` (accepted on 2026-11-19).

## Global Constraints

- Attributes Prowess/Cunning/Resistance: base 1 each, exactly 5 additional points, integer ratings 1–5, total 8.
- Skills Combat/Subterfuge/Lore: base 0 each, exactly 5 points, integer ratings 0–5, total 5. Combat 0 is allowed.
- Name: nonblank, trimmed before starting, maximum 24 characters. Use native input `maxlength=24` and JavaScript string length consistently; render text safely.
- Three steps: Attributes (with name), Skills, Review. Back preserves the draft; Cancel or refresh discards it without replacing the saved adventure.
- Health = Prowess + Resistance; Initiative = Prowess + Cunning; resource capacity = Cunning + Resistance; melee pools = Prowess + Combat and Resistance + Combat.
- Continue and Restart preserve the named build. Restart restores its full derived Health and the original world/three slime placements. Victory heals to derived maximum; Run preserves damage.
- Existing valid saves receive the name Adventurer. Retain historical validation, recovery keys, absence-only fallback, blocked-write migration stability and production/acceptance save isolation.
- Preserve opposed d10 rules, slime 3/3 pools and 3 Health, camera, collision, encounter identities, 300 ms battle lock, focus and persistent announcements.
- Roster management, reusable templates, import/export, multiple adventure slots, leveling, XP, gear, classes, specializations, resource spending, initiative scheduling and other attack modes stay deferred.
- At least 48×48 touch targets, vertical scrolling allowed, no horizontal overflow at 320×568, 390×844 and 844×390.
- No deployment or merge in this implementation run; finish with a verified draft PR for owner acceptance.

## Review Focus

1. Malformed ratings, incomplete budgets, whitespace names and names resembling markup must never produce a valid or executable adventure (Tasks 1–3).
2. Legal nonstarter builds, especially Combat 0 and different Health/pools, must survive save/reload, combat and Restart without reverting to the fixed starter (Tasks 2–3).
3. Cancellation, repeated Begin/Confirm activation and another tab saving while creation/confirmation is open must never silently overwrite progress or generate multiple adventures (Task 3).
4. Old malformed v4 builds must remain invalid; historical migrations and blocked writes must preserve map/progress without rerolling or crossing save namespaces (Tasks 2 and 4).
5. Typing, IME/name editing, focus/storage refresh and arrow-key reading must not close the draft, move the hero, lose focus or make primary navigation unreachable on a small phone (Tasks 3–4).

## File responsibilities and interfaces

- `src/game/character.ts`: export `CharacterRatings` containing the existing attributes/skills, and `Character = CharacterRatings & { name: string }`. `createStarterCharacter(): Character` adds the name Adventurer. `deriveStats` and `getMeleePools` accept `CharacterRatings`. Keep `isStarterCharacter(value): value is CharacterRatings` as the exact historical fixed-build validator; add `isValidCharacter(value: unknown): value is Character` for canonical names plus current creation budgets/bounds.
- Create `src/game/creation.ts`: export `AllocationGroup = 'attributes' | 'skills'`, `AllocationChange` as a discriminated group/key pair with `delta: -1 | 1`, `createCharacterDraft(): Character`, `remainingPoints(draft: Character, group: AllocationGroup): number`, `allocatePoint(draft: Character, change: AllocationChange): Character`, and `finishCharacter(draft: Character): Character | null`. The draft starts with empty name and base ratings. Changes are immutable; rejected changes return the original object. Finishing trims the name, validates, and returns an independent deep copy.
- `src/game/types.ts`, `src/game/world.ts`, `src/game/session.ts`: checkpoint v5 uses the named Character. Final `Action` New Game requires both `world` and `character`. `createCheckpoint(world: WorldDefinition, character?: Character): Checkpoint` defaults to the historical starter only for existing non-creation callers; production New Game passes the allocated character and Restart explicitly passes the saved one. Copy the character, derive full Health, and preserve all existing battle interfaces.
- `src/game/legacy-save.ts`, `src/game/save.ts`, `src/game/save-keys.ts`: freeze v4 decoding using the exact starter validator and 5-Health cap, add v5 parsing, and layer existing migrations. Keep load/save status, source and resolver interfaces intact. `getSaveKeys(baseUrl)` gains `v4`, and current advances to v5 in both isolated namespaces.
- Create `src/view/character-creation.ts`: `mountCharacterCreation(root: HTMLElement, callbacks: { onBegin(character: Character): void; onConfirm(character: Character): void; onCancel(): void }): { showOverwriteConfirmation(changed?: boolean): void; destroy(): void }`. Own the draft, step and confirmation UI here, with no storage/world-generation calls. Cancelling confirmation returns to Review with the draft intact. Destroy removes listeners using an AbortController or equivalent component-owned cleanup.
- `src/view/ui.ts`: integrate this component with title rendering, existing saved-checkpoint state and the pre-action refresh callback. New Game opens creation; only a confirmed completed build emits `UiAction { type: 'newGame'; character: Character }`. Add the name to the existing Character disclosure and derive initial battle copy from the actual pools rather than the current hardcoded 5d10 message.
- `src/main.ts`: retain ownership of storage, world generation and session dispatch. Refresh saved-adventure observations during title/creation, without unmounting or resetting the draft. Validate a New Game build and title state before generating a world. Existing scene rendering remains title/exploration/battle; no new Phaser creation state is needed.
- `src/style.css`: hide the decorative world frame during creation and give the three-step form a scrollable body with reachable navigation. Preserve the existing adventure layout. Update edition to 04.
- Tests: extend `tests/character.test.ts`, `tests/character-save.test.ts`, `tests/save-keys.test.ts`, session/encounter/battle tests and fixtures; create `tests/creation.test.ts` and `e2e/creation.spec.ts`. Update existing e2e New Game expectations/helpers and `scripts/verify-deployment.mjs` for allocation before starting, while retaining historical fixtures.

### Task 1: Named character rules and immutable allocation

**Files:** Modify `src/game/character.ts`, `tests/character.test.ts`; create `src/game/creation.ts`, `tests/creation.test.ts`; mechanically update exact starter expectations in `tests/character-save.test.ts` if the added default name changes them.

**Interfaces:** Produce the named model, historical starter guard and pure creation functions defined above. Existing checkpoint version and UI remain unchanged in this task; the default starter factory still supplies the same ratings.

- [ ] Write tests asserting an empty draft has attributes 1/1/1, skills 0/0/0 and 5 points left in each group. Allocate/reclaim to reach 3/3/2 and 2/2/1; reject decrement below base, rating above 5 and spending beyond the budget without mutation. Test that mutating the finished result cannot change the draft or another starter instance.
- [ ] Write validation tests for complete named builds, including Prowess/Cunning/Resistance 1/5/2 with Combat/Subterfuge/Lore 0/5/0: Health 3, Initiative 6, resource capacity 7, Attack 1d10, Defense 2d10. Test 5/1/2 with 5/0/0: Health 7, Attack 10d10, Defense 7d10. Reject wrong totals, missing groups, fractions, strings, NaN/Infinity and out-of-range ratings.
- [ ] Test finishing trims a valid name; blank/whitespace and over-24 names fail; punctuation/Unicode are retained. Stored validation rejects untrimmed names rather than silently repairing them. The historical starter guard still accepts the unnamed 3/3/2 + 2/2/1 shape and rejects other legal current builds.
- [ ] Run `npm test -- tests/creation.test.ts tests/character.test.ts`; expect missing-function/behavior failures before implementation.
- [ ] Implement the declared pure functions and model. Do not add presets, roster IDs, progression fields or allocation UI yet.
- [ ] Run `npm test` and `npm run typecheck`; expect all unit tests and compilation to pass. Commit as `feat: add named character creation rules`.

### Task 2: Checkpoint v5 and build-preserving adventures

**Files:** Modify `src/game/types.ts`, `src/game/world.ts`, `src/game/session.ts`, `src/game/legacy-save.ts`, `src/game/save.ts`, `src/game/save-keys.ts`, `src/main.ts`, `tests/fixtures.ts`, affected save/world/session/encounter tests, `e2e/helpers.ts` and current-schema browser literals. Add tests to `tests/character-save.test.ts` and `tests/save-keys.test.ts`.

**Interfaces:** Produce v5 checkpoints and strict v4→v5 migration. Final game `Action` New Game requires `character`; the existing title adapter in main supplies `createStarterCharacter()` until Task 3 connects allocated UI characters. `UiAction` remains the old title command until Task 3. This keeps the existing starter game functional at the task boundary.

- [ ] Test v5 round-trip with both nonstarter builds from Task 1, exact name/world/position/completion retention and current Health 1 through each build's derived maximum. Reject incomplete budgets, illegal names and Health 0, fractional or above that maximum. Test checkpoint construction copies its input rather than retaining mutable draft references.
- [ ] Test valid v4 saves become v5 Adventurer with identical ratings, Health, world, placements and completion, consuming no RNG. An otherwise legal current allocation stored as v4 remains invalid, as do v4 Health 6 and missing character data. Preserve all existing v3/v2/v1 translation, sampling and Health rules before adding Adventurer.
- [ ] Test key order v5→v4→v3→v2→v1, exact key/schema agreement, no fallback past a present invalid newer key, unchanged recovery keys and separate production/acceptance prefixes for every version. Keep migration source/resolver behavior and existing blocked-write cache coverage.
- [ ] Test New Game with the 1/5/2, 0/5/0 build starts at Health 3 and battle pools 1/2. Use exact injected dice to prove its attacks/counterattacks resolve with those sizes. Test Run damage retention, victory healing to 3, Continue and defeat/Restart retaining name/build/world while resetting completion and restoring 3 Health. Also prove the 7-Health build is accepted rather than capped at 5, and an invalid New Game character returns the original session instead of creating an invalid checkpoint.
- [ ] Run `npm test -- tests/character-save.test.ts tests/save-keys.test.ts tests/session.test.ts tests/encounters.test.ts`; expect the new schema/build assertions to fail.
- [ ] Implement the declared schema, factories, session changes and layered decoders. Guard session New Game with `isValidCharacter` and copy only valid builds into checkpoints. Keep historical character types independent of the named current type; validate old data before conversion. Update the current fixtures to v5/Adventurer, preserving explicitly historical fixtures unchanged. Add the explicit default starter to the existing main title adapter solely until Task 3 replaces it with the completed build.
- [ ] Run `npm test` and `npm run typecheck`; expect all pass. Commit as `feat: preserve allocated characters in adventure saves`.

### Task 3: Phone creation flow, safe Begin and read-only sheet

**Files:** Create `src/view/character-creation.ts`, `e2e/creation.spec.ts`; modify `src/view/ui.ts`, `src/main.ts`, `src/game/types.ts`, `src/style.css`, `e2e/helpers.ts` and existing New Game browser scenarios.

**Interfaces:** Consume Tasks 1–2. Produce the mounted creation component contract and final `UiAction { type: 'newGame'; character: Character }`. Main passes that character to the game Action with a generated world; remove the Task 2 starter title adapter. Session GameState remains title while creating, so the existing scene need not render a new state.

- [ ] Add browser tests walking Attributes→Skills→Review with a typed name and the Combat 0 build. Assert exact point counters, bounded controls, disabled incomplete navigation, live derived values, preserved Back edits, trimmed name and derived 3-Health HUD after Begin. Inspect the named Character disclosure: no input/edit controls or resource/level controls during play, and initial battle copy uses 1d10 rather than hardcoded 5d10.
- [ ] Test name text `Moss & <b>Fern</b>` renders literally in review and sheet, with no injected `b` element. Reject whitespace-only names; exercise a Unicode name and the 24-character boundary. Enter/Space/arrows/WASD in the name field must edit normally without movement, losing text or triggering Begin; do not interrupt IME composition with whole-form replacement.
- [ ] Test Cancel with an existing v5 save leaves its raw contents unchanged, and refresh during creation discards the draft without changing progress. Test cancelled overwrite confirmation returns to Review with every draft value retained. Partial creation must not write an adventure.
- [ ] Test two-tab races: another tab saves during creation, then again while overwrite confirmation is open. Begin must refresh the current saved observation; Confirm must refresh again. Capture `JSON.stringify(savedCheckpoint)` when confirmation is shown; if refreshed content differs, retain the draft and require a fresh confirmation with a short changed-save notice. A title/focus/storage refresh must never replace the mounted form or reset its input/focus. Test synchronous repeated Begin/Confirm activation creates only one adventure/checkpoint.
- [ ] Run `npm run test:e2e -- e2e/creation.spec.ts`; expect failures because New Game currently skips allocation.
- [ ] Implement component-local draft/step/confirmation state and event handlers. Use DOM text/value assignment or an audited text-escaping helper for all names. Preserve focus/selection and scroll on allocation changes, keep a persistent creation announcement region, and use unique labels for its budget/navigation controls. Only `finishCharacter` results may reach Begin/Confirm callbacks.
- [ ] Integrate creation into UI: New Game mounts it; Cancel unmounts and focuses New Game; valid Begin invokes the pre-action saved refresh before confirmation; valid Confirm repeats that refresh/fingerprint check. Tear down once before emitting the completed action. Main rejects invalid/non-title New Game actions before RNG/world generation and resets the viewport only when an adventure actually begins. Existing migrations on save refresh remain permitted; drafts themselves are never persisted.
- [ ] Add named read-only sheet content to the existing Character disclosure. Retain current-Health HUD, battle gates, persistent combat announcements and arrow-key reading behavior. Update edition to 04; apply the approved three-step phone layout without importing preview-only example/reset controls.
- [ ] Update existing e2e helpers with `createCharacter(page, { name, attributes, skills })` and `startAdventure(page, build?)`, using UI allocation rather than production shortcuts. Default helper build is Adventurer 3/3/2 + 2/2/1; `seed` still writes current checkpoints directly for non-creation regression tests. Adapt New Game/overwrite flows to the new UI; preserve the original collision, focus, save and camera assertions.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run test:e2e`; expect all pass. Commit as `feat: create starting characters through the phone UI`.

### Task 4: Accessibility, migration regressions and review handoff

**Files:** Extend `e2e/creation.spec.ts`, `e2e/combat.spec.ts`, `e2e/slimes.spec.ts`, `e2e/world.spec.ts`, `e2e/game.spec.ts` as needed; update `scripts/verify-deployment.mjs`, `README.md` and create `docs/superpowers/iteration-4-status.md`. Fix findings only in their owning files/tests.

**Interfaces:** Consume the completed UI/schema contracts. Produce verification evidence and a draft PR on `codex/iteration-4`, with accepted scope and manual phone checklist.

- [ ] Exercise creation, Review and named sheet at 320×568, 390×844 and 844×390, including 18px monospace description text and a long 24-character name. Assert no horizontal overflow, touch targets at least 48×48, scrollable content and reachable primary navigation. Check keyboard focus after allocation/Back/cancelled confirmation, and persistent announcements rather than replacing live nodes on every input.
- [ ] Extend browser migrations to valid v4 and earlier saves, including completed slime tiles and blocked v5 writes. Assert Adventurer identity, unchanged accepted build/Health/world/progress, stable repeated migration attempts and source-change cache invalidation. Retain all recovery keys and test both namespaces. Update `scripts/verify-deployment.mjs` for v5 acceptance saves and creation before starting. It must support an existing Iteration 3 main build that still starts directly as well as the new wizard, since acceptance deploys before main release. Keep its two-path isolation checks; no hosting workflow changes.
- [ ] Complete a nonstarter browser adventure sequence: exact rolls, Run and Continue with damage, victory to full derived Health, then defeat/Restart preserving the chosen name/build and exact map/placements. Existing battle-input, details-reading and identical-turn announcement regressions remain green.
- [ ] Document creation, temporary drafts, overwrite confirmation, fixed adventure builds, historical Adventurer naming, schema upgrades and deferred roster/leveling. Add manual phone acceptance steps and record actual verification counts, source revision and any limitations.
- [ ] Run `npm run typecheck`, `npm test`, `npm run test:e2e` and `git diff --check`; inspect phone screenshots and the final diff. Expect all checks pass. Use a tracked owned preview process if Windows teardown needs it; stop that process afterward.
- [ ] Request one fresh independent whole-branch review through the native executing-plans/requesting-code-review workflow, supplying the approved spec, this plan, exact base/head, evidence and ledger rulings. Fix Important/Critical findings in one RED→GREEN pass and rerun the affected/full checks as required by those changes. Record deferred minor findings rather than expanding scope.
- [ ] Commit documentation, push `codex/iteration-4`, create and attach a draft PR with validation and owner acceptance steps, and stop owned preview servers. Do not publish to acceptance or merge until the owner directs it. Keep the mockup separate from application source and preserve the planning documents in the branch.

## Self-review and handoff

All six design acceptance criteria map to tests in Tasks 1–4. The five Review Focus cases have owning tests. Historical starter validation remains separate from current allocation rules, source-change confirmation retains the draft, and no allocation data enters Phaser or storage until the valid start boundary. The staged title adapter is explicitly replaced in Task 3; all final cross-task types/functions agree. Native execution remains selected. The owner reviews this plan before implementation.
