# Iteration 6 implementation status

The approved progression design is implemented on `codex/iteration-6`, based on Iteration 5 main at `669f00d`. The release awaits acceptance deployment and player testing.

Each slime gives 1 XP. Every 5 XP advances the character and grants one bankable point for an Attribute or Skill. The same XP cost function drives the rules and the character sheet. Find more slimes starts a new wave once the clearing is empty. Restart restores the original encounters while preserving advancement. Existing Iteration 5 rosters upgrade under their namespace lock and start with level 1 and 0 XP.

## Verification

- Typecheck, 138 unit tests and 83 Chromium browser tests passed.
- Browser coverage includes five wins across two waves, banking and spending, v6 upgrade, failed writes, retry after two unsaved victories, competing tabs, and keyboard control at 320 × 568, 390 × 844, and 844 × 390.
- Local production and acceptance builds passed. Combined deployment verification passed with Iteration 5 and 6, and again with Iteration 6 on both paths. The smoke check verified persisted XP, separate save namespaces, and zero runtime or asset failures. The existing Phaser bundle-size advisory remains.

## Review decisions

- Landed the new checkpoint and roster parsers together so the branch did not need a temporary compatibility adapter. Rule and persistence regressions were observed failing separately before their implementations.
- The independent reviewer identified saves with huge melee dice pools that could crash combat. Limit each effective melee pool to 1,024 dice because the game retains individual faces for the roll log. Reject saves above the limit and disable any spend that would cross it. This constrains extreme builds but leaves role choices and the creation cap behavior intact.
- The verifier now requires Iteration 6 on the acceptance path, so a successful run includes progression checks. It accepts earlier supported builds on the main path.
- Physical phone and assistive-technology checks remain part of acceptance.
