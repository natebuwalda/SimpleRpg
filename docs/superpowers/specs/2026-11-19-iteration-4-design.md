# Iteration 4: Character creation and starting sheet

Status: proposed short design for owner review. The interactive layout is approved; no application implementation has started.

## Intent and iteration boundary

Let the player name and allocate a starting character, inspect the resulting sheet, and use that build in an adventure. Establish this foundation before adding reusable character management. Leveling remains out of scope.

The owner approved splitting the work:

- Iteration 4: create a character per New Game, allocate points, review the sheet, and preserve the chosen build on Continue and Restart.
- Iteration 5: an independent reusable roster with creation, selection for a new adventure, editing and deletion. Existing adventures retain their starting build when the roster changes.

No roster, reusable templates, import/export, multiple adventure slots, leveling, XP, gear, classes, specializations, resource spending, initiative scheduling, or additional attack modes are added in Iteration 4.

## Approaches and chosen direction

We considered creation within New Game, a reusable in-game roster, and external creation with import. The owner ultimately wants characters reused across adventures and approved an in-game roster, but agreed to deliver allocation/sheet first and roster management separately. External import/export is deferred. Characters are copied into their adventure rather than edited during play; switching characters requires a New Game.

The owner approved the phone mockup: three creation steps (Attributes, Skills, Review), separate point budgets, plus/minus controls, live derived stats and a read-only sheet. The mockup is design-only and does not write game saves. Its example-build and reset controls are preview tools, not requested product features.

## Creation rules

- Attributes: Prowess, Cunning and Resistance start at 1. Spend exactly 5 additional points across them. Each final rating is an integer from 1 through 5; total ratings sum to 8.
- Skills: Combat, Subterfuge and Lore start at 0. Spend exactly 5 points across them. Each final rating is an integer from 0 through 5; total ratings sum to 5.
- Combat 0 is explicitly allowed. Subterfuge and Lore can receive points even though their corresponding actions remain deferred. Show this limitation while allocating skills so the player understands the current choice.
- Increment/decrement controls respect each base, maximum and remaining budget. Points may be reclaimed and redistributed before starting. A group cannot advance until its entire budget is allocated.
- Proposed name detail: a nonblank name, trimmed before starting, with a 24-character input limit. Render names as text, including punctuation and Unicode; never interpret them as markup. Names need not be unique because this iteration has one adventure and no roster.
- Start the draft with base ratings and an empty name. The mockup's prefilled Rowan name is illustrative. A draft is temporary: cancelling creation or refreshing discards it and leaves the saved adventure intact.

Derived values update immediately as points change:

- Maximum Health = Prowess + Resistance.
- Initiative = Prowess + Cunning.
- Resource capacity = Cunning + Resistance; still read-only, with no spending.
- Melee Attack pool = Prowess + Combat; Defense pool = Resistance + Combat.

Keep the accepted opposed-d10 and slime rules unchanged. Builds with lower melee pools, different maximum Health or a one-hit victory remain legitimate; do not rebalance them or force progress.

## Player flow and adventure behavior

1. New Game opens character creation. Step 1 collects the name and attributes; Step 2 allocates skills; Step 3 reviews all values. Back preserves the draft. Cancel returns to the title without changing the current save.
2. Begin adventure requires a complete valid build. Re-read the saved-adventure state at this point. If an adventure exists, ask for the existing overwrite confirmation before replacing it. Cancelling that confirmation preserves both the saved adventure and the current draft for further review.
3. Only confirmed Begin generates a new map and takes an independent copy of the named build into its starting checkpoint at full derived Health. There is still one saved adventure. A change from another tab must not be overwritten without confirmation.
4. Continue resumes the saved adventure's character, name, current Health, map and completion. It does not reopen creation.
5. Restart after defeat preserves the character/name and original world/slime placements, resets all encounters, and restores full derived Health. It does not reopen allocation or revert to the Iteration 3 starter.
6. The adventure sheet is read-only. Use the existing Character entry to show the name, attributes, skills, derived maximum Health/Initiative/resource capacity and effective melee pools. Current Health stays in the existing HUD. No editing or character switching occurs during an adventure.

Preserve accepted victory full healing, Run damage retention, safe return positions, camera behavior, independent slime completion and command locks. Creation inputs must not trigger movement shortcuts; reading character/roll details must retain the accepted keyboard and screen-reader behavior.

## Persistence and compatibility

Persist the name and allocated build as part of the adventure checkpoint. No independent character file or roster is introduced. Use a new save version, retaining all previous recovery keys, absence-only fallback, strict historical validation and stable within-session migrations when writes are blocked. Production and acceptance saves remain isolated.

The current v4 decoder requires the exact starter build; it must remain the historical validator for that version rather than being loosened. New saves validate the complete creation rules, stored name and current Health against that character's derived maximum. Invalid budgets, ratings, names or Health must be rejected rather than normalized into valid new saves.

Proposed compatibility name: valid existing saves receive the name **Adventurer** and retain their previously accepted build, current Health, world, placements, position and completion. Earlier migrations continue to apply their existing coordinate/placement and Health rules before adding the name. A valid v4 save must not reroll placements or reset progress. Existing players can Continue immediately or choose New Game to allocate a different build.

## Phone layout and implementation choices

Follow the approved three-step layout and existing woodland visual style. Keep primary navigation reachable with at least 48×48 touch targets, readable point counters, accessible labels, persistent announcements and no horizontal overflow at 320×568, 390×844 and 844×390. Permit vertical scrolling for longer sheets. Maintain focus when points change and when opening/closing disclosures or returning between steps.

Planning may settle component/file boundaries and how the read-only sheet fits the existing Character disclosure. It must preserve the approved information, fixed adventure build and existing movement/battle controls. No new runtime dependencies or hosting changes are required. Native execution remains the selected method.

## Acceptance

1. Build allocation enforces both exact budgets and all rating bounds, including Combat 0. Partial/invalid builds cannot begin.
2. Name and derived stats render correctly; changing a relevant rating updates maximum Health and pools immediately. Review and Back preserve the draft.
3. Cancel and cancelled overwrite confirmation preserve the existing adventure; cross-tab changes still require confirmation before replacement.
4. New Game starts the chosen build at its derived full Health. Battle uses its actual pools; victory, Run, Continue and Restart preserve the agreed semantics for nonstarter builds.
5. Save/reload preserves the named build; valid older saves upgrade without lost progress, strict historical validation remains intact, and blocked storage stays playable and predictable.
6. The sheet is read-only and phone-accessible. Keyboard input in creation does not move the hero, and the accepted map, input-lock, announcement, save-isolation and layout regressions remain covered.

The owner reviews this design before implementation planning. Iteration 5 roster work stays deferred.
