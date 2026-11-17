# Iteration 1: Larger worlds and buffered scrolling

Status: approved by the owner on November 17, 2026; implementation plan follows separately.

## Intent and confirmed requirements

Replace the fixed, single-screen world with a randomly sized map that extends beyond the existing view panel. Keep three visible tile rows above/below, or three visible tile columns left/right, ahead of the character's movement. This buffer controls scrolling; terrain is not hidden by a sight-radius or fog system.

Keep the accepted phone controls, collision, battle loop, local saves, and responsive panel layout.

## Approach

Use a buffered camera over a finite world. Keep the current 10-by-10-tile viewport and 16-pixel logical tiles. The character can move within the middle four rows/columns, indices 3 through 6 inclusive. When a successful move would place the character outside that area, shift the viewport by the minimum whole-tile amount that restores the three-tile margin. Blocked movement does not scroll. Horizontal and vertical offsets are independent.

A camera that always centers the hero would also provide lookahead but would scroll on every movement; buffered scrolling directly matches the owner's requested behavior. Zooming the entire map to fit would shrink phone tiles and would not deliver a world extending beyond the view. No engine or stack change is needed.

## Proposed defaults

The owner approved these defaults with the design:

- Choose width and height independently, uniformly from integer sizes 20 through 40, on New Game. Each is larger than the viewport. Two consecutive games may legitimately receive equal sizes.
- Randomize dimensions only in this iteration. Use the current woodland style with walkable ground, a path, an obstacle, and one reachable slime. Random terrain, additional enemies, and infinite world generation are deferred.
- Include a three-tile-thick impassable forest border within the world dimensions. This preserves three visible map tiles ahead even when the character reaches the playable edge; the camera never needs to show empty space beyond the map.
- Use immediate, whole-tile camera shifts to match current one-tile movement. Smooth animation can follow later.
- Save the world dimensions, layout definition/version, character position, HP, and cleared encounter state. Continue must restore the same world and derive its camera offset from position. Battle screens use their existing fixed composition; returning to exploration restores the appropriate map view.
- Migrate existing Iteration 0 saves without losing HP or encounter completion. Expand their world into a fixed larger layout and translate saved positions and landmark positions consistently into the playable interior. Preserve relative positions of the character, obstacle, and slime; the old one-screen boundary need not remain a wall inside the expanded world. Specify exact translation and validation in the implementation plan.
- Keep the three-tile margin as a named configurable value with default 3. No player-facing settings screen is required yet.

## Implementation boundaries

Represent world data separately from viewport coordinates. Movement, collision, encounters, and save validation use world coordinates and the saved world definition. A pure viewport calculation converts world coordinates into screen coordinates; render only the visible tiles. Map dimensions and terrain rules must come from that world definition rather than independent hard-coded renderer constants.

## Acceptance

1. New Game produces valid independently chosen dimensions in the approved range, while the panel still displays 10 by 10 tiles at the existing visual scale.
2. The character moves inside the middle camera area before scrolling. After every legal move, at least three full tile rows/columns remain visible ahead; shifts are minimal and deterministic.
3. Walking toward all four edges keeps the character in bounds and preserves the buffer using the forest border. Obstacles do not move the character or camera.
4. The slime remains reachable, battles work, and escape/victory return to the correct world position and view.
5. Refresh/Continue preserves the exact generated world, progress, and appropriate view. Valid old saves migrate; invalid saves and unavailable storage remain safe.
6. Existing touch, keyboard, focus, rapid-input, and phone rotation behavior continues to pass. Add focused rules and browser checks for world generation, scrolling in four directions, camera edges, save migration, and battle return outside the original screen.

The owner approved this short design. Native execution remains the previously selected development approach unless the owner changes it.
