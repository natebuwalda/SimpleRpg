# Iteration 6: Player levels and repeat slime encounters

Status: owner approved the design on 2026-11-27.

## Goal and agreed rules

Give each roster character a repeatable way to earn levels and improve their build during one playthrough.

- A slime victory earns 1 XP. A character starts at level 1 and needs 5 XP for each level in this iteration.
- Each new level grants one point. Spend it to raise one Attribute or Skill by 1, or keep it for later.
- The original character creation limits still apply at creation. There is no level gate on raising a rating. For example, Combat 5 can become Combat 6 at level 2.
- After clearing all three slimes, the player may choose **Find more slimes** to spawn the next wave of three on the same map.
- Keep the XP curve easy to change. The initial curve supersedes the earlier 100 × level proposal.

## Approaches

We considered replenishing slimes automatically after each victory and allowing players to start the next wave themselves. The owner selected **Find more slimes**, which gives players control over when exploration becomes dangerous again and retains the reward of a peaceful clearing.

We considered the rule that a character's level must be at least the current rating before raising it. The owner chose one point per level that can be spent on any Attribute or Skill, without that gate, so specializing at creation still leaves a valuable choice at level 2.

## Repeat encounters

Keep the original map and initial placements as the Restart baseline. After the third victory, exploration shows **Find more slimes**. Until the player activates it, the clearing stays peaceful. The command works only during exploration with zero living slimes. It leaves the hero's location and Health alone and starts one new wave on three distinct walkable tiles. Exclude the hero's tile and starting tile. Prior wave locations can be reused. The new placements and defeated state are saved with the selected playthrough, so reload cannot reroll an existing wave or recreate its defeated slimes.

Every distinct victory awards XP once. Run, defeat, spawning the next wave, acknowledging victory, and resuming a save grant no XP. Victory saves the encounter completion and advancement together in the same checkpoint. The existing per-slot revision checks guard concurrent saves. Retry after a failed save persists the pending checkpoint instead of replaying the reward.

## Advancement and tuning

Put the XP reward and the cost to advance from a given current level in one rules module. Use one function for both the advancement calculation and the player-facing XP target. Initially the function returns 5 for every level. Keep it capable of accepting a level-dependent curve, such as 100 × current level, without rewriting encounter logic, save validation or UI. Advance automatically when earned XP meets the cost and carry excess XP forward. Persist earned level, XP carried toward the next level, and enough information to validate how points were spent. Earned levels and spent points are authoritative across tuning changes. Decide how to apply a future curve to partially earned XP when that curve ships.

Proposed player flow: show the XP award and any level gained on Victory. Show level, XP toward the next level, and available points on the adventure's Character sheet. Allow spending there during exploration only, with the existing roster View sheet displaying read-only progression. Use one explicit spend action for each supported rating. A point raises that rating by exactly one and immediately affects the derived stats or pools that use it. A point increase to maximum Health leaves current Health where it is; Victory and Restart still heal to the current derived maximum. The save keeps the original valid creation build separate from earned improvements so the creation validator stays strict. Keep the same budget rules at creation and validate post-creation investments against the number of levels earned.

## Saves and Restart

Proposed defaults: carry forward Iteration 5 roster saves through a versioned upgrade. Each existing slot starts at level 1 and 0 XP, with its name, build, world, position, Health, defeated status and current encounter completion preserved. Earlier cleared slimes do not grant retroactive XP. An existing peaceful clearing can immediately use **Find more slimes**. Continue to isolate production and acceptance. Use the existing lock and revision guard for upgrades and writes. A malformed new record must not cause silent fallback to an older roster.

Defeat and Restart keep level, XP, spent improvements and unspent points. Restart restores full derived Health, returns the hero to the original spawn, and begins again with the original three slime placements. Slimes in that reset wave award XP when defeated again. Persist point spending and wave generation as whole-slot operations. If either deliberate action fails to save, keep the previous state and show an error so the player can retry. If the current playthrough has unsaved progress, require a successful **Retry save** before offering Spend, Find more slimes or Restart. Apply this to an unsaved defeat as well so a Restart cannot restore an older checkpoint without the XP earned since that checkpoint.

Write the upgraded roster under the same namespace lock used by Iteration 5. Once the new roster is saved, it is the source of truth. An older tab may still write its old key, but those later writes do not affect the upgraded roster. Ask players to refresh older tabs when releasing Iteration 6.

## Scope and acceptance

Keep the current roster size, movement, slime stats, opposed dice rules and allocation budgets. This iteration adds no classes, specializations, gear, new enemy types or resource spending. Keep phone controls reachable by scrolling, respect existing keyboard focus and combat announcements, and reuse the current sheet and control styles.

Verify first level after five wins across two waves, banking and spending points, raising a starting rating of 5, the effect on derived values and dice pools, and the same UI and calculation using an alternate XP curve. Verify the peaceful interval, legal placement, no XP from non-victory actions, no duplicate rewards on reload or failed save retry, and safe concurrent updates. Verify migration of active, cleared and defeated roster slots, independent progression across slots, and Restart retaining advancement while restoring the original clearing. The implementation plan may settle concrete types, module boundaries, exact UI labels beyond **Find more slimes**, and upgrade details consistent with these rules.
