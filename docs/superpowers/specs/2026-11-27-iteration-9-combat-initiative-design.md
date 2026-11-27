# Iteration 9 combat initiative

Roll initiative at the start of each encounter. Show the resulting turn order on the combat page before the player acts. Initiative gives Cunning a combat use and establishes turn order ahead of the Rogue class.

## Approach

The accepted approach rolls once when the encounter opens and waits for the player to choose an action before resolving the first round. The order stays fixed until the encounter ends. An immediate slime attack on encounter entry would resolve part of the round before the player can see the roll and choose an action.

## Initiative

- The player's raw Initiative is effective Prowess + Cunning, including advancement. A slime's raw Initiative is its level + 2, giving it 3 at level 1 and one more each level.
- Both sides use the existing d10 pool rules. Each 8, 9, or 10 is a success. Each original 10 also grants one bonus die. A bonus 10 cannot grant another die.
- Sort highest to lowest by successes, then by raw Initiative. A player wins an otherwise exact tie against an NPC.
- The implementation caps initiative dice at the existing 1,024-dice combat limit. It uses the raw score for ties, so existing characters with very high Cunning remain playable and keep their ratings.

## Round resolution

- Show the ordered combatants and their success counts in a visible, accessible **Turn Order** list on the combat page before the first action. Keep it visible on subsequent rounds. The round summary and dice details follow the order in which actions resolved.
- The player's action choice starts each round. A living slime attempts one attack on its turn. A combatant defeated before its turn never acts. Both sides use their existing attack and defense pools and damage rules.
- Run uses the player's place in the order. When the player acts first, escape is immediate. When the slime acts first, the player takes the slime's turn before escaping. Surviving damage is carried back into exploration. A lethal hit prevents escape and triggers the usual defeat flow.
- A later encounter rolls fresh initiative, including after Run, reload, or Restart. The order lives only in the current encounter. Keep the existing roster and checkpoint formats.

## Acceptance

Verify both possible orders, higher raw Initiative breaking a tied success count, the player winning an exact tie, and the displayed order persisting across rounds. Verify that lethal first actions skip the second turn and that Run follows the rolled order. Cover a level 1 slime, a higher wave, advanced player Initiative, supported phone viewports, and existing save compatibility. Rogue, extra actions, and balance tuning are out of scope.
