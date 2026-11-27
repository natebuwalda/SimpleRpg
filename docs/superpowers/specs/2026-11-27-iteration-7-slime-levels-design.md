# Iteration 7: Slime levels

Status: written design for owner review.

The current wave sets the level of every slime in the clearing. A new adventure starts at slime level 1. Once all three slimes are defeated, a successful **Find more slimes** action raises that level by one and spawns three new slimes under the existing placement rules.

| Slime level | Maximum Health | Attack | Defense | XP per victory |
|---|---:|---:|---:|---:|
| 1 | 3 | 3d10 | 3d10 | 1 |
| 2 | 4 | 4d10 | 4d10 | 2 |
| 3 | 5 | 5d10 | 5d10 | 3 |

At level L, a slime has L + 2 Health, Attack dice and Defense dice, and awards L XP. Keep these values together in the slime rules so battle setup, dice rolls, save validation, and victory feedback use the same numbers. The existing character XP curve still applies. A large reward can grant multiple player levels and one point for each.

## Approach

Use one saved level for the whole wave. Storing a level on each slime would support mixed-level groups, which this iteration has no need for. Advance the shared level and generate the new placements in the existing Find transaction. Retry after a failed write and simultaneous requests in two tabs must not skip a level or start two waves.

**Restart** restores the original placements at slime level 1, resets encounter completion, and restores the hero's full Health. The player keeps earned levels, XP, and points. Level 1 slimes in the reset clearing award 1 XP when defeated again.

## Proposed implementation defaults

- Show the slime level in exploration and battle. Victory feedback shows the actual XP earned and announces the resulting player level if it increased.
- Carry forward existing roster saves with player progress and the current clearing intact. Assign existing slimes level 1 because earlier waves did not record a level. Apply the level 1 reward to future victories only. Preserve supported older-save upgrades and the separate production and acceptance namespaces.
- Save encounter completion and XP together. Use the saved current wave level to verify awards on writes, including retries that include several pending victories. A failed Find leaves both the level and placements intact.
- Respect the existing 1,024-dice ceiling for recorded melee rolls. Slime level 1,022 is the highest supported wave, and the clearing remains peaceful after it is defeated. At that limit, the UI explains that there are no higher waves.
- Keep three slimes per wave, the same map and placement rules, the current dice mechanics, and the player XP curve. This iteration covers slimes as the first leveled NPC. Other enemy types and mixed-level waves remain outside its scope.

## Acceptance

Confirm level 1 baseline values, a single increment per successful Find, correct higher-level attack and defense pools, actual XP rewards, and multi-level player advancement. Reload preserves the current wave level and placements. Restart from a higher wave restores level 1 and preserves player advancement. Exercise migration, failure and retry, competing tabs, and the upper bound.
