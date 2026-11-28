# Iteration 14 Cumulative XP

Change the progression curve for new characters so the next playtest can isolate how player growth affects the four class Resource systems. Use player level, slime wave, and effective combat stats when comparing the fresh runs with the existing playtest.

## Progression

- Newly created characters start at level 1 with zero XP. The step from level N to N + 1 costs 5 × N XP. Keep 5 as a named tuning value for this experiment.
- Total XP milestones for levels 1–6 are 0, 5, 15, 30, 50, and 75. XP carries across level boundaries. Each level gained still grants one point for an Attribute or Skill.
- The character sheet and roster detail show lifetime XP and the next lifetime threshold, such as `Level 3 · 18 / 30 total XP · 2 points available` for an unspent build. A victory shows the XP earned from that encounter.
- Keep slime XP rewards, waves, enemy stats, class actions, and advancement spending rules as in Iteration 13 so the playtest varies one progression rule.

## Existing characters and saves

- Give each character a saved curve identifier. All existing characters keep their flat 5 XP per level, earned level, XP remainder, and investments. Resume and Restart retain the character’s curve. Their lifetime XP is `5 × (level − 1) + XP earned at the current level`.
- Keep the existing level and XP remainder as the saved advancement state. Derive the lifetime total and next threshold from that state and the character’s curve. This preserves historical XP and uses the same stored balance to validate and apply awards.
- Use roster v13 and checkpoint v12. Upgrade supported older rosters through the existing locked migration path, preserving slot IDs, status, revisions, and adventure data. Keep old saves readable for migration and leave their original keys intact. Production and acceptance retain separate save keys.

## Approaches considered

Apply the new curve only to new characters. That preserves the prior playtest builds and lets both curves coexist in one roster. Applying the new curve to everyone would either reduce earned levels and invalidate spent points or require an artificial XP adjustment to keep those levels.

## Acceptance

- Verify cumulative milestones, excess XP crossing a threshold, multiple levels from one award, and one point per level gained. Clearing ten full three-slime waves on a fresh run should yield 165 total XP at level 8.
- Verify that migrated characters still level every 5 XP and fresh characters use the new thresholds. Confirm both curves and all earned progression survive reload and Restart.
- Confirm the roster and character sheet agree on total XP and the next threshold, and that main and acceptance storage remain isolated.
