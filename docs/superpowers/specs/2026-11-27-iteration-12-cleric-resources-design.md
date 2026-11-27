# Iteration 12 Cleric and Resources

Add Cleric as a permanent class choice with four combat actions. Melee uses the same Prowess + Combat attack as Warrior and Rogue. Clerics also have Heal, Smite, and Run. They defend with Resistance + Combat.

## Approach

Heal spends a Resource and Smite restores one. Using the same pool and opposite limits makes the actions work together. A Cleric who has plenty of Resources can heal more effectively. A Cleric who has few Resources can deal more damage with Smite. Melee remains available at either extreme.

## Resources

- Maximum Resources is effective Cunning + Resistance, including advancement. At New Game and Restart, set Current Resources to half the maximum, rounded up.
- Current Resources carry between encounters and persist with the safe checkpoint on victory or escape. Victory still restores Health and carries forward the resulting Resources. Reload during an unresolved encounter opens the last safe checkpoint. Restart begins with full Health and the half-full Resource pool.
- If advancement increases Maximum Resources, Current Resources stays at its saved amount. Only Cleric uses Current Resources in this iteration.

## Heal and Smite

- Both actions take the Cleric's turn and use the encounter's rolled Turn Order. If an earlier enemy attack defeats the Cleric, the chosen action never resolves and changes no Resources.
- Both actions roll effective Resistance + Lore unopposed. Use the existing d10 rules. Each 8–10 succeeds, and each original 10 grants one non-chaining bonus die. Use the existing 1,024-dice ceiling.
- **Heal** is available whenever Current Resources is above zero, including at full Health. Restore one HP per success, capped by Current Resources before spending and by missing Health. Then spend exactly one Resource. Zero healing still spends one.
- **Smite** is available whenever Current Resources is below Maximum Resources. Deal one direct damage per success, capped by Maximum minus Current Resources before the gain. The target makes no Defense roll against Smite. Then restore exactly one Resource. Zero damage still restores one. A lethal Smite keeps the restored Resource and prevents a later enemy turn.
- Melee and Run use their existing rules and leave Resources as they are. Unavailable commands consume neither a turn nor dice.

For example, with a maximum of 5 the Cleric starts at 3. Heal can restore up to 3 HP and leaves 2 Resources. Starting from the same 3, Smite can deal up to 2 damage and leaves 4 Resources.

## Display and saves

- Show Current and Maximum Resources during exploration and combat and in roster details. Explain the pool and tradeoff in character creation. Show which action is unavailable at zero or full Resources and describe each resolved action's actual result and Resource change in order.
- Keep all four actions touch- and keyboard-accessible. Use two rows when needed on narrow phones and retain the existing input guard.
- Introduce roster v11 and checkpoint v10. Migrate supported older rosters while preserving the existing classes, builds, progress, and adventures. Save Current Resources for Clerics only. Validate it against the effective cap and keep production and acceptance storage separate.

## Acceptance

Verify starting and Restart rounding, both bounds and zero-success changes, a capped heal and a capped Smite, an earlier lethal slime turn, a lethal Smite, and normal Melee. Verify Resources carry through victory, escape, Resume, and advancement, and that pre-Cleric saves still load. Exercise four actions, the disabled states, and repeated input on the supported phone sizes.
