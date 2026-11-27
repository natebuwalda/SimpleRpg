# Iteration 8 implementation status

New characters choose Warrior or Wizard before allocating skills. Warriors use Melee with Prowess + Combat. Wizards use Magic with Prowess + Lore. Both can Run and defend with Resistance + Combat. The review, adventure sheet, and roster details show the class.

The v9 roster upgrades supported older characters to Warrior and preserves their adventure and advancement. Iteration 7 saves retain their current slime level. New saves preserve the class through Resume and Restart.

## Phone acceptance

1. Create a Warrior and a Wizard with the same allocations. Check the class and attack pool on the review and adventure sheets. Enter a fight with each and confirm the correct action and Run are available.
2. Earn an advancement point with the Wizard and spend it on Lore. Check that Magic gains one die. Reload, Resume, and verify that the pool persists. Lose a fight and Restart to confirm the class and advancement persist while the wave returns to level 1.
3. Resume an Iteration 7 save. Check that it shows Warrior and that the wave and player advancement match the prior save.

## Verification

- Typecheck, 156 unit tests, and 95 Chromium tests passed.
- An independent review found no material defects. Follow-up tests exercise held Magic input across three phone viewports and rejection of class changes in autosaves.
- The local deployment smoke passed with Iteration 7 on main and Iteration 8 on acceptance, and with Iteration 8 at both paths. It verified both classes, wave and XP persistence, and isolation between save namespaces.
