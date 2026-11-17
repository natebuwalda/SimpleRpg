# Iteration 2: Three randomly placed slimes

Status: approved by the owner on November 17, 2026; implementation planning follows.

## Intent and confirmed requirements

Place three slimes randomly around the map, only on traversable tiles. Defeated slimes remain gone until Restart. Retain the accepted random world dimensions, three-tile scrolling buffer, touch/keyboard input, and battle rules.

## Approach

Build a list of eligible traversable tiles and sample three distinct positions without replacement. This directly guarantees valid placement and no overlap without repeatedly retrying random coordinates. Give the placements stable identities, `slime-1`, `slime-2`, and `slime-3`, and save their positions as part of the world.

The existing code has one fixed encounter position and a shared completion ID. Extend encounter lookup, the active battle, completion tracking, rendering, and save validation to use the identity of the particular slime encountered. Keep terrain generation and viewport rules unchanged.

## Proposed defaults

- New Game creates exactly three stationary slime placements on distinct traversable tiles, excluding the hero's starting tile. Forest-border and obstacle tiles are ineligible. Placement may include paths or tiles adjacent to the hero; no minimum spacing is added.
- The present maps have a connected traversable interior, so all eligible placements are reachable. No roaming or respawning during exploration is introduced.
- Entering a living slime's tile starts the existing one-slime battle. Victory marks only that slime defeated; its tile becomes ordinary traversable ground. Run returns to the preceding safe tile and leaves that slime available, as it does today.
- Restart preserves world dimensions, terrain, and the same three slime positions, resets the hero to the world's starting position with full HP, and restores all three slimes. New Game chooses new dimensions and new placements. Coincidentally repeated random results are valid.
- Save/Continue preserves the exact placements and each defeated state. Refresh during battle still restores the last exploration checkpoint. Refresh alone does not restore defeated slimes.
- Show the number of remaining slimes in the existing exploration text. Show the peaceful-clearing message only after all three have been defeated. No minimap, enemy movement, new combat abilities, or new assets are needed.
- The old far-corner path remains terrain decoration; paths do not promise to lead to each random slime.

## Existing saves

Preserve valid Iteration 0 and 1 saves. Keep the original slime's position, identity, and defeated state, then add two randomly placed slimes on other eligible tiles. Exclude the saved hero position as well as the starting tile when adding them. Persist this upgrade so repeated Continue or reload cannot relocate the new slimes.

An upgraded save whose original slime was already defeated therefore starts with two living slimes and one defeated placement; Restart restores all three. This preserves previously earned progress. Continue prioritizes the newest saved format, rejects corrupt current saves instead of loading stale progress, and retains the existing safe behavior when storage is unavailable. The implementation plan will pin the exact new schema, validation, and migration tests.

## Acceptance

1. New Game always produces exactly three distinct, traversable, non-starting slime placements across the supported world sizes.
2. Each slime can independently start a battle. Defeating one leaves the other two living and visible when in view; Run does not defeat or relocate any slime.
3. Defeated slimes remain gone through movement, subsequent battles, refresh, and Continue. Clearing all three makes their tiles ordinary ground and shows the peaceful message.
4. Restart restores the same three placements and clears their defeated states. New Game replaces the world and its placements after the existing overwrite confirmation.
5. Existing saves upgrade once without losing world shape, hero state, or previous slime completion. No upgrade places a new slime under the saved hero. Invalid placements, IDs, duplicates, or completion references are rejected safely.
6. Existing scrolling, phone layouts, collision, input/focus, and storage tests remain green. Add generation, independent battle completion, restart, persistence, migration, and invalid-save coverage, then verify a hosted exploratory preview before owner acceptance.

The owner approved this short design. Native execution remains the selected method; starting a separate cloud chat is a separate owner action.
