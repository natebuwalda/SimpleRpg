# Iteration 13 Resources for Warrior, Rogue, and Wizard

Give Warrior, Rogue, and Wizard their own Resource loops. All classes use effective Cunning + Resistance as Maximum Resources. Cleric keeps the Resource rules from Iteration 12.

## Approach

Resolve Resource actions in the existing Turn Order. Warrior builds and Wizard reserves Resources within a fight. Rogue and Cleric carry their balances in checkpoints. Study reserves points for one fixed Shield and can release them. Using Study to change the Spell Slot buff type is a future feature.

## Warrior

- Start each encounter with 0 Resources and 0 Momentum. Gain one Resource whenever Melee resolves, including on a miss, and one each time an enemy action deals positive HP damage to the Warrior. Each gain stops at Maximum Resources.
- Momentum takes the Warrior's turn. Pay Resources equal to the number of stacks already held, then gain one stack. The first stack is free. The new stack boosts Melee and Defense starting at that point in the round, with the existing dice ceiling. Disable Momentum when the Warrior cannot afford it.
- Execute takes the Warrior's turn and instantly defeats a target whose remaining Health is strictly less than Current Resources. Equality is insufficient. It requires no roll, clears Momentum, and uses the normal victory flow. Show it as unavailable when the current threshold is unmet.
- Clear Resources and Momentum at encounter exit, including victory, defeat, and Run.

## Rogue

- New Game and Restart set Resources to 0. Current Resources carry through victory, Run, Resume, and later encounters. If advancement raises Maximum Resources, keep the existing balance.
- Each resolved Melee adds one Exploit Debuff stack to the target, including on a miss. Melee deals its ordinary damage and does not spend stacks. There is no stack cap. All stacks clear at encounter exit.
- Exploit requires at least one stack and the Rogue acting first after the existing initiative tie-breakers. Take the Rogue's turn to add the stack count to Current Resources, capped at Maximum Resources, and clear all stacks. Then deal direct damage equal to the resulting Current Resources. It requires no dice and does not spend those Resources. A lethal Exploit uses the normal victory flow.
- Prepare takes the Rogue's turn and spends one Resource to add one to their initiative success total for the encounter. Recalculate Turn Order for the next round using the existing raw Initiative and player tie-breakers. Finish the current round in its original order. Exploit uses the updated order on later rounds.

## Wizard

- Start each encounter with Maximum Resources. Nuke still deals effective Cunning + Lore direct damage without a roll on the Wizard's turn. It costs one available Resource when it resolves.
- If Shield is inactive, Study lets the Wizard choose a whole number of available Resources to reserve, from one up to the current available amount. The selection itself takes no turn. Resolving Study on the Wizard's turn moves those points into the Shield reservation.
- While Shield is active, reduce each incoming damage event by the reserved amount down to zero. The full reservation applies to each event and does not diminish when it absorbs damage. A Shield raised after an earlier hit cannot reduce that hit.
- Choosing Study again takes the Wizard's turn to remove Shield and return all reserved points to the available balance. The release is available even with no unreserved Resources. An enemy acting earlier that round still faces Shield. Both Shield and its reservation clear at encounter exit.

## Display and saved games

- Show Current and Maximum Resources during combat. Show carried Resources in exploration and roster details for Rogue and Cleric. Show Momentum stacks and cost, the Execute threshold, Exploit stacks and initiative restriction, and the Wizard's reserved amount and Shield strength. Make the available Resource count distinct from the reserved amount.
- Show the new commands alongside Melee or Magic and Run. Use the established four-action layout on narrow screens and keep blocked commands, amount selection, and ordered combat feedback accessible by touch and keyboard.
- Introduce roster v12 and checkpoint v11. Migrate existing Rogues to 0 Resources and preserve Clerics' saved amounts, other classes, and all adventure data. Store only Rogue and Cleric balances. Keep battle stacks, transient Resources, Shield, and Prepare's initiative bonus out of checkpoints. Preserve production and acceptance save separation.

## Acceptance

Verify Warrior gains on Melee and damaging hits, a free first Momentum, escalating costs, Execute's strict threshold, and reset at encounter exit. Verify Rogue stack creation, full conversion and damage at the cap, the Exploit gate, Prepare changing the next round, and Resource carryover. Verify Wizard Nuke costs, chosen reservations, repeated Shield reduction, release at zero available, and initiative timing. Check existing saves, Cleric behavior, and phone controls.
