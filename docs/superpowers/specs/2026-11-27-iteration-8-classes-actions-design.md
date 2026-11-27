# Iteration 8: Warrior, Wizard, and combat actions

Status: written design for owner review.

Give players a class choice that makes Combat and Lore useful for different offensive builds. A Warrior uses **Melee**. A Wizard uses **Magic**. Both can **Run**. All existing characters become Warriors.

## Approach

We considered introducing a general action system in a separate iteration. Build the two actions alongside their classes in this iteration instead. An action describes the offensive roll, and a class determines which offensive action is available. Reuse the same combat flow for both. This gives the action model two concrete users without adding a broader ability system.

## Combat

| Class | Offensive action | Attack pool | Defense pool against a slime counterattack |
|---|---|---|---|
| Warrior | Melee | Prowess + Combat | Resistance + Combat |
| Wizard | Magic | Prowess + Lore | Resistance + Combat |

Both actions roll against the slime's current Defense pool and use the existing d10 success, bonus die, tie, and damage rules. A surviving slime counterattacks as it does today. Preserve Run, wave scaling, XP, victory healing, defeat, Restart, and the existing input guard. The game rules enforce class access to offensive actions as well as showing the appropriate button. Apply the existing recorded-dice ceiling to the effective attack and defense pools the class uses.

## Creation, display, and saves

Proposed flow: add a labeled class choice to the existing name and Attributes step. Require a choice before advancing and keep it while navigating the draft. Briefly show which skill powers the class's attack. Preserve both creation budgets and all legal allocations. Combat still matters for a Wizard's defense, and Lore improves a Wizard's Magic. The review, adventure sheet, and roster details show the class. Show the class's effective attack and defense pools during creation and in the character sheet. The battle command uses **Melee** or **Magic** as its label.

Use a versioned roster upgrade. Assign Warrior to characters loaded from supported older saves, preserving their builds, advancement, current wave, and placements. New saves record the chosen class in the character's starting build and preserve it across Resume and Restart. Existing save isolation and locked, revision-checked writes still apply. Class selection is permanent for that character.

## Scope and acceptance

The iteration contains two classes and two offensive actions. Defer resources, cooldowns, class trees, specializations, extra targeting, loot, and inventory. Verify melee parity for an upgraded Warrior, Lore-based Magic before and after spending a point, identical damage rules, class-action enforcement, and the correct action after reload and Restart. Check that migrated saves retain progress and that creation and combat controls remain usable at the supported phone sizes.
