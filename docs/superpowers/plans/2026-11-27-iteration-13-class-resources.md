# Iteration 13 Class Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal** — Give Warrior, Rogue, and Wizard their approved Resource rules, with visible balances and actions.

**Architecture** — Keep current and maximum Resources in each encounter and apply class effects through the existing ordered turn resolver. Save only carried Rogue and Cleric balances. Use the same eligibility rules for command dispatch and disabled controls.

**Tech stack** — TypeScript, Vite, Phaser, Vitest, Playwright Chromium, and GitHub Pages.

**Spec** — [Approved class Resources design](../specs/2026-11-27-iteration-13-class-resources-design.md).

## Global constraints

- Maximum Resources is effective Cunning + Resistance. Preserve Cleric Heal, Smite, initialization, and carryover.
- Warrior starts each encounter at zero. Melee and positive incoming damage each grant one Resource, capped at maximum. Momentum pays its current stack count, and Execute requires target HP strictly below current Resources.
- Rogue starts New Game and Restart at zero and carries Resources across encounters. Melee adds one stack even on a miss. Exploit requires first turn after tie-breakers and at least one stack. Prepare adds one initiative success for later rounds.
- Wizard starts each encounter full. Spend one Resource for Nuke. Study reserves a chosen positive amount for Shield or releases the entire existing reservation.
- Write roster v12 and checkpoint v11. Preserve earlier save data and storage namespaces. Keep transient combat data out of saves.

## Review focus

- Simultaneous gains in one Warrior round respect capacity. A zero-damage hit grants nothing. A lethal earlier enemy attack cancels the chosen player action.
- Prepare changes the next round's order. The current round never repeats or skips a combatant. Exploit can use first place won by either existing tie-breaker.
- Exploit converts stacks into a capped balance before dealing direct damage. Melee never consumes or adds damage from those stacks.
- Study validates missing, zero, fractional, and unaffordable amounts before RNG or state changes. Releasing at zero available returns only reserved points. Enemy attacks earlier in the round use the Shield in effect at that time.
- A failed Rogue victory or escape save retains the balance alongside HP and XP in memory. Retry writes the result once. Four controls, disabled reasons, and the Study amount input remain usable in phone viewports with held input and keyboard focus.

## Task 1 — Battle state and class actions

**Files** — `src/game/combat-actions.ts`, `types.ts`, `battle.ts`, `session.ts`, `tests/class-resources.test.ts`, and earlier class/action tests.

**Interfaces** — Add `'execute' | 'prepare' | 'study'` to `ClassAction`. Give every `BattleClassAction` variant `currentResources: number` and `maxResources: number`. Keep `kind` tags. The Wizard's `'nuke'` state adds `reservedResources: number`. The Rogue's `'exploit'` state keeps its exact `stacks: bigint` and drops the old dice pool. Extend `resolveTurn(state, command, rng?, studyAmount?)` and `canUseCombatCommand(state, command, studyAmount?)`. Dispatch Study as `{ type: 'study'; amount?: number }`; all other combat commands keep the existing shape. Export a shared `combatCommandUnavailableReason` with the same arguments so business rules and UI explanations agree.

**Log records** — Keep original dice and base margins on ordinary attacks. Attach optional Resource gain, Exploit stack gain, or Shield absorption fields to the attack entry, when applicable. Add ordered entries for Execute, Prepare, Study reservation/release, and Exploit's conversion and direct damage. Add Resource cost to Momentum and the post-cost balance to Nuke. Preserve Heal and Smite entries.

- [ ] Write and run failing Warrior cases. A miss gives one Resource, then a one-damage slime hit gives another. A zero-damage hit gives none. Check capacity, free first Momentum, second stack costing one, and cost assessed at the Warrior's turn. Test Execute with equal HP and Resources, then with strictly higher Resources and no RNG for a winning first action. Check terminal reset on all exits.
- [ ] Write and run failing Rogue cases. Three Melee turns add three stacks and ordinary damage. Exploit from 3 / 5 with three stacks reaches 5 / 5 and deals 5 direct damage, clears the stacks, and consumes no dice for its action. Verify missing stacks, later initiative, and eligibility after an initiative tie-break. Script a slower Rogue who spends one Resource on Prepare to move first next round, with the current order and one action per combatant preserved.
- [ ] Write and run failing Wizard cases. A Wizard starts at maximum, Nuke spends one and is unavailable at zero. Reserve three of five, reduce subsequent damage by three per hit, spend the remaining two on Nuke, then release back to three. Cover earlier and later attacks when raising and dropping Shield, zero effective damage, malformed reservation amounts, and lethal hits before the chosen action.
- [ ] Implement the class actions in the existing round loop. Share initiative ranking between entry and Prepare. Snapshot the current round order before resolving and apply Prepare's new ranking on exit from the round. Apply Shield after opposed-roll damage and before changing HP. Remove the previous Rogue damage bonus logic. Update tests whose declared class behavior changed and run the focused class suites plus initiative and Cleric tests.

## Task 2 — Carried Resources and save migration

**Files** — `src/game/world.ts`, `session.ts`, `types.ts`, `save.ts`, `save-keys.ts`, `roster.ts`, `roster-store.ts`, `tests/class-resource-save.test.ts`, and current save fixtures.

**Interfaces** — Roster v12 stores checkpoint v11. Continue reading supported roster versions 6–11 in descending order on absence only. Checkpoint v11 stores an integer `currentResources` within effective capacity for Rogue and Cleric and omits it for Warrior and Wizard. Older Rogue checkpoints normalize to zero. Older Clerics keep their valid balance.

- [ ] Write and run failing persistence tests. Upgrade a v11 roster with all four classes, including progressed or defeated slots. Compare IDs, revisions, status, placement, and advancement. Verify the Rogue initializes to zero, the Cleric keeps Resources, legacy bytes are untouched, and invalid newest data blocks fallback. Reject missing, out-of-range, or fractional current Rogue Resources.
- [ ] Initialize and transfer carried values in checkpoint creation, Restart, and the victory and escape paths. Verify the Rogue carries Resources through Resume and advancement, then restarts at zero. Verify failed writes and retry preserve the final balance, HP, XP, and revision without crediting twice. Keep encounter state outside save snapshots and continue using the locked roster store.
- [ ] Update current fixtures while keeping historical fixtures on their original versions. Run `npm run typecheck` and `npm test` after completing the round-log migration in Task 3.

## Task 3 — Combat UI and release verification

**Files** — `src/view/ui.ts`, `character-creation.ts`, `class-action.ts`, `roster.ts`, `src/style.css`, `e2e/class-resources.spec.ts`, affected browser tests, `scripts/verify-deployment.mjs`, and `README.md`.

**Interfaces** — Show `Resources` as available / maximum, plus Momentum stacks and the cost to add one, an explicit Execute threshold, Exploit stacks, and `Shield reservation` showing the reserved amount separately. Use one labeled `Resources to reserve` number input with integer bounds from 1 to the available balance. Default it to 1 when a reservation is possible. Changing the amount must not resolve a turn. While Shield is active, show Study as the release action. Build disabled reasons and use the existing pending-turn protection and focus restoration.

- [ ] Write and observe failing browser cases. Verify Warrior gain, Momentum cost and Execute; a Rogue Prepare round changes Turn Order and enables a stacked Exploit; a Wizard chooses an amount, gains Shield, and releases after spending available Resources. Verify a Rogue carries Resources after reload and an existing Cleric save keeps its balance.
- [ ] Implement ordered logs, updated character guidance and four-action layouts. Verify keyboard and touch at 320×568, 390×844, and 844×390. Exercise an invalid Study input, a valid amount selection, held input, and focus when a command disables or changes after resolution. Update the existing Rogue and Momentum browser scenarios for the approved rule changes.
- [ ] Set `ITERATION 13`. Update the README and deployment verifier. Support Iteration 12 on main and require Iteration 13 on acceptance. Exercise deterministic Warrior, Rogue, and Wizard Resource actions plus Cleric, initiative, wave, XP, and storage isolation.
- [ ] Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `git diff --check`. Smoke-test local 12/13 and 13/13 layouts and stop the test servers. Run one independent whole-branch review, address material findings, open a draft PR, and verify final-head CI before acceptance handoff.
