# Iteration 7 implementation status

Iteration 7 is implemented on `codex/iteration-7`. Each successful Find starts a new three-slime wave one level higher. Slimes start at level 1, gain one Health and die in each melee pool per slime level, and award XP equal to their level. Restart restores the original level 1 wave and keeps the player's advancement. Iteration 5 and 6 roster upgrades preserve current and original placements and initialize slime level to 1.

## Verification

- Typecheck, 149 unit tests and 89 Chromium tests passed after the final review fixes.
- Local production and acceptance builds passed. Both 06/07 and 07/07 deployment layouts passed the smoke test, including a level 2 battle, its two XP reward, persistence through reload, and save isolation.
- Browser checks cover the competing Find flow, scaled XP recovery after failed saves, Restart, and final-wave readouts on the supported viewport sizes. Physical-device acceptance remains for the acceptance deployment.

## Review decisions

- Released the rules, persistence and UI together so every commit still has matching checkpoint and roster formats.
- Verified a deterministic victory against the final level 1,022 wave with both recorded pools within the 1,024-dice limit.
- At the existing player-level numeric ceiling, XP now fills only the remaining representable progress. Grouped autosave retries and individual victories produce the same result, and victory reports only the amount actually credited.
