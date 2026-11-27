# Iteration 11 Momentum and Nuke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal** — Give Warriors Momentum and Wizards Nuke as alternatives to their normal attack and Run.

**Architecture** — Add each class action to the existing class metadata and resolve it in the current round loop. Keep class-action state and ordered log entries in memory. Use the same action metadata in creation, character sheets, and combat controls.

**Tech stack** — TypeScript, Vite, Phaser, Vitest, Playwright Chromium, and GitHub Pages.

**Spec** — [Approved Momentum and Nuke design](../specs/2026-11-27-iteration-11-momentum-nuke-design.md).

## Global constraints

- Momentum and Nuke each take the player's turn, regardless of initiative order. Keep Rogue's existing Exploit eligibility and all ordinary attack and Run rules.
- Momentum adds one stack with no roll and no damage. Every stack adds one die to Melee and Defense from that point forward. Stacks have no gameplay cap, stay through later rolls, and clear at encounter exit. Individual rolls cap at 1,024 dice.
- Nuke deals effective Cunning + Lore damage directly, with no roll, cost, or cooldown. A lethal earlier action prevents the defeated combatant from acting.
- Keep roster v10 and checkpoint v9. Existing characters get their class action automatically. Keep combat state out of saves.

## Review focus

- A slime that attacks before the Warrior uses Momentum faces the old Defense pool. A later slime attack faces the newly increased pool.
- A very large Momentum count stays exact and caps the dice for Melee and Defense independently. A normal Melee hit leaves all stacks intact.
- A Wizard defeated before their turn never casts Nuke. A lethal Nuke before the slime's turn consumes no combat RNG and goes through the normal victory save.
- Commands for the wrong class and input held during resolution cannot add stacks, deal damage, or advance the round.
- Existing v10 saves load through the public roster flow. Narrow phone combat controls expose the current values and retain usable touch targets and keyboard focus.

## Task 1 — Class actions and ordered resolution

**Files** — `src/game/combat-actions.ts`, `src/game/battle.ts`, `src/game/types.ts`, `tests/momentum-nuke.test.ts`, and affected Rogue battle fixtures.

**Interfaces** — Add `ClassAction = 'momentum' | 'nuke' | 'exploit'` to the combat command union. Give each class a `classAction: ClassAction` and share labels for the three actions. Export `getNukeDamage(ratings: CharacterRatings): number` using Cunning + Lore. Replace the standalone encounter Exploit field with `classAction` state of one of these shapes: `{ kind: 'momentum'; stacks: bigint }`, `{ kind: 'nuke'; damage: number }`, or `{ kind: 'exploit'; pool: number; stacks: bigint }`. Export `canUseCombatCommand(state: BattleState, command: CombatCommand): boolean` and `getBattlePools(state: Pick<BattleState, 'heroPools' | 'classAction'>): BattleState['heroPools']`. Extend the ordered log with `{ kind: 'momentum'; stacks: bigint }` and `{ kind: 'nuke'; damage: number }`. Keep attack and Exploit entries.

- [ ] Write failing Momentum tests. Script the slime's attack after the first Momentum and assert its defense roll includes one extra die. Reverse initiative and assert the defense uses the old pool. Take Momentum twice, then Melee, and assert both pools use the two extra dice and stacks remain.
- [ ] Write failing Momentum ceiling and lifecycle tests. Seed stacks above the safe-integer range, verify exact increment and 1,024 dice per pool, and confirm a fresh encounter after escape and after defeat and Restart has zero stacks.
- [ ] Write failing Nuke tests with effective Cunning 3 and Lore 1. Assert 4 direct damage and zero combat dice against a three-Health slime on Wizard-first. On a later wave assert nonlethal damage, exactly one normal enemy attack, and the expected event order. Script a slime-first lethal hit and assert no Nuke log entry. Add invested Cunning and Lore and assert both contribute. Verify the session routes a lethal Nuke through normal XP, healing, and completion.
- [ ] Write a failing command-eligibility test for wrong-class actions and resolved battles. Run `npx vitest run tests/momentum-nuke.test.ts` and observe the missing behavior.
- [ ] Implement metadata, eligibility, and per-turn effects. Keep base Melee and Defense pools intact in state. Compute their capped effective values at the point of each roll so a Momentum action affects only later rolls. Clear encounter stacks on terminal outcomes. Run the new suite plus `tests/initiative.test.ts` and `tests/rogue.test.ts`. Integrate Task 2 before the runtime commit so each ordered-log consumer compiles.

## Task 2 — Combat display, compatibility, and release

**Files** — `src/view/ui.ts`, `character-creation.ts`, `roster.ts`, `src/style.css` as needed, `e2e/momentum-nuke.spec.ts`, `scripts/verify-deployment.mjs`, and `README.md`.

**Interfaces** — Read the class action from the current battle and the shared metadata for creation and sheets. Use combat labels `Momentum`, `Nuke`, `Momentum stacks`, and `Nuke damage`. Show current effective Melee and Defense for Warrior in combat. Preserve the existing Exploit label, stack count, and disabled reason.

- [ ] Write and observe failing browser tests. Seed valid Iteration 10 roster data for Warrior and Wizard. Verify Warrior starts with zero Momentum, then gains a stack and shows the increased Melee and Defense. Verify each class sees its own action and that the action remains available after reload. Verify Wizard Nuke reports 4 damage without an attack or defense entry and survives the normal victory reload. Verify a slower Wizard can select Nuke but loses the turn if defeated first.
- [ ] Implement the controls, shared labels, sheet descriptions, current values, and ordered summaries, details, and announcements. Reuse the combat-command input guard. Keep Momentum and Nuke logs explicit about which actions took no dice. Test both actions for held input across the pending interval, and check the controls and values at 320×568, 390×844, and 844×390.
- [ ] Set `ITERATION 11`. Update the README and deployment verifier. Support Iteration 10 on main and require Iteration 11 on acceptance. Verify a Warrior Momentum round and a Wizard Nuke victory while retaining prior class, initiative, XP, wave, and save-isolation checks.
- [ ] Run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `git diff --check`. Smoke-test local 10/11 and 11/11 deployment layouts and stop the test servers. Run one independent whole-branch review, address material findings, open a draft PR, and verify final-head CI before the acceptance handoff.
