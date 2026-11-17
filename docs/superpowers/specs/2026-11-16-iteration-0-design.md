# Iteration 0 Design

## Intent and agreed scope

Build the smallest playable foundation for a browser RPG inspired by Final Fantasy 1. The owner will develop through Codex while traveling and test through a link on a phone. Success is opening that link, exploring with touch controls, completing a battle, refreshing, and continuing.

The agreed outline includes TypeScript, Phaser, Vite, a start screen, one hero, one small map with collision, a visible encounter, Attack and Run, victory and defeat, versioned local saves, and a hosted preview. Four-character parties, spells, items, shops, quests, and larger maps are deferred.

## Approaches

- **Chosen in conversation: browser game using TypeScript, Phaser, and Vite.** Easy to distribute by link and build using ordinary source files. Custom RPG rules and menus must be implemented.
- **Alternative considered: Godot with GDScript.** Offers a visual game editor and desktop exports, but adds editor/export workflow to this small browser-first project.

## Repository and environment evidence

The owner supplied `natebuwalda/SimpleRpg`, README-only at `2241f1f`, with a published cloud checkout at `/workspace/SimpleRpg`. On November 16, the environment listing confirms SimpleRpg is ready and runnable with repository ref `main`. This chat has no cloud shell tool. Its local workspace contains only an unborn Git repository with no remote. These documents are local planning artifacts, not changes verified against or published to GitHub. Recheck the actual checkout and any AGENTS.md before implementation; preserve newer work.

## Proposed implementation defaults

These details are builder decisions to make the outline implementable, and remain reviewable proposals rather than additional user requirements.

### Screens and input

Use an HTML title/menu layer and touch buttons around a Phaser canvas. Semantic HTML buttons give reliable touch targets and allow browser tests without reading canvas pixels. Exploration and battle use the canvas for graphics, with battle commands and status text in HTML.

Design for portrait while supporting landscape without clipping. At 320 CSS pixels wide, status and controls remain usable without horizontal scrolling. Touch targets are at least 48 by 48 CSS pixels. Fit the map above the controls, account for safe-area insets, and avoid disabling zoom globally. Suppress touch gestures only on game controls. Keyboard arrows/WASD move; Enter/Space activate focused HTML buttons.

Movement is one orthogonal tile per press, with key auto-repeat ignored for Iteration 0. This intentionally simple input avoids stuck movement when an app loses focus. No diagonal movement. Pause game input when the page is hidden or unfocused and clear held input state.

### Exploration

Use a 10 by 10 map with 16-pixel logical tiles and nearest-neighbor rendering. Use generated colored placeholder textures; no external asset licenses or map editor needed yet. Boundary tiles are blocked, hero starts at (2,2), obstacle at (4,3), encounter at (6,4); all other interior tiles are walkable. Coordinates use (x,y), origin at upper left. A completed encounter tile becomes normal ground.

### Battle

The hero starts at 12/12 HP and deals 4 damage. A slime starts at 6 HP and deals 2 damage. Attack resolves hero damage, then enemy retaliation only if it survived. HP never falls below zero. Disable commands during resolution and ignore extra taps until it finishes. Display health and a short result message.

Run always succeeds with no retaliation, returns to the tile immediately preceding the encounter, and leaves the encounter available. Victory marks the encounter complete, fully heals the hero, and returns to that same safe tile. Defeat shows Restart, which creates a fresh game. A confirmation is required before New Game replaces an existing valid save. These simplified rules establish the loop without an encounter-balancing system.

### Persistence

Store one version-1 checkpoint under `simple-rpg.save.v1`: hero HP, safe map position, and completed encounter IDs. Save on New Game, successful movement onto ordinary tiles, successful escape, and victory. Never save a transient battle or zero-HP state. Refresh during battle returns to the last exploration checkpoint. Refresh during defeat also returns to that checkpoint; Restart explicitly replaces it.

Validate parsed saves: exact version, integer in-bounds walkable position that is not an uncleared encounter, integer HP from 1 through 12, and unique known encounter IDs. Standing on a completed encounter tile is valid. Missing, corrupt, or unsupported saves disable Continue with a readable message rather than crashing. Catch storage access/quota failures: allow play and show that progress cannot be saved. Browser saves are device/browser specific; there is no cloud sync or offline guarantee.

### Architecture and release

Keep movement, battle, and save validation in plain TypeScript functions. A session controller owns transitions; Phaser renders state and HTML emits commands. Use Vitest for rules and Playwright for browser flows and phone-sized viewports. Install current compatible stable dependencies at implementation time and commit the lockfile; do not select versions from memory.

Build a static site with Vite base `/SimpleRpg/` for GitHub Pages. CI runs typechecking, unit tests, browser smoke checks, and build. A separate Pages workflow supports manual deployment and releases from `main`; verify repository Pages availability/settings first. Document the real deployed URL only after it works. Hosting setup or access that cannot be completed is an explicit remaining dependency, not a claimed success.

## Constraints and non-goals

- Browser-first, single-player, portrait-first with usable landscape layout.
- No backend, accounts, database, multiplayer, React, or cloud saves.
- No offline/PWA installation requirement in Iteration 0.
- Original placeholder graphics and names; no Final Fantasy assets or branding.
- No app scaffolding or implementation as part of this planning task.

## Acceptance

1. New Game opens the map; touch and keyboard move one tile, respecting walls and bounds.
2. The encounter starts one battle; ordinary movement cannot continue during battle.
3. Two attacks defeat the slime; the first retaliation reduces hero HP to 10 and there is no retaliation after victory.
4. Run, victory, defeat/Restart, and New Game confirmation behave as specified.
5. Continue restores a valid checkpoint after refresh; invalid or unavailable storage never crashes the game.
6. Controls fit 320x568 and 390x844 portrait and 844x390 landscape viewports; losing focus cannot leave an action active.
7. Automated checks pass and a real phone can load the hosted build, complete a battle, refresh, and continue.

The owner should review these proposed defaults with the implementation plan before product code is written.
