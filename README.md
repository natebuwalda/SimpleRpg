# SimpleRpg

A small browser RPG built with TypeScript, Phaser and Vite. Each roster character has an independent saved playthrough.

**[Play SimpleRpg](https://natebuwalda.github.io/SimpleRpg/)** — main follows accepted releases. Iteration 5 shipped in [PR #6](https://github.com/natebuwalda/SimpleRpg/pull/6).
**[Acceptance game](https://natebuwalda.github.io/SimpleRpg/acceptance/)** — separately pinned candidate, with isolated browser saves.

Iteration 13 gives Warrior, Rogue, and Wizard their own Resource rules.

## Development

Use Node 24.21.0 (see .nvmrc), then `npm ci` and `npm run dev`. Append `/SimpleRpg/` to the printed URL. Checks: `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`. Install browser-test Chromium with `npx playwright install chromium`; cloud hosts can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. No runtime dependencies were added for the roster.

Playwright traces use the OS temporary directory to avoid OneDrive locks. `PLAYWRIGHT_OUTPUT_DIR` overrides that path; do not run suites concurrently with the same output directory. Explicit screenshots are in ignored `test-results/`. Designs, plans and iteration evidence are under `docs/superpowers/`.

## Characters and playthroughs

The roster lists up to ten characters in creation order. **New Character** opens Attributes, Skills and Review. Choose Warrior, Wizard, Rogue, or Cleric on the Attributes step. The class is permanent once the adventure begins. A name must be nonblank, trimmed, and at most 24 UTF-16 code units. Attributes Prowess/Cunning/Resistance start at 1 with five additional points; skills Combat/Subterfuge/Lore start at 0 with a separate five points. Each rating caps at five and each budget must be spent completely. Combat 0 is valid for every class. Back preserves the draft; Cancel or refresh discards it without taking a slot. Begin adventure saves a new character and fresh world together before entering play.

At ten slots, creation is disabled; existing playthroughs still Resume/Restart. **View** shows the read-only build and adventure summary. Characters cannot be edited. Duplicate names are allowed; each slot has its own internal identity. **Delete character** requires confirmation and permanently deletes both character and adventure.

**Return to characters** switches out of exploration, victory or defeat. Resume selects that character's own world, position, Health and slain slimes. Returning does not reset progress. Intermediate battles are not saved; reloading during battle resumes the last safe checkpoint. Defeat itself is saved: the roster shows Defeated and offers Restart. **Restart** has no penalty: same character, map and original three placements, full derived Health, original spawn and all slimes restored. It never consumes another slot. Clearing all three slimes leaves a peaceful, resumable map.

## Movement and combat

Tap directions or use arrows/WASD, one tile per press. Worlds independently choose width/height 20–40, with three stationary slimes on distinct traversable tiles away from the hero's start. The panel shows 10x10 tiles and scrolls to retain three visible tiles ahead. A three-tile impassable forest border remains; paths are decoration and there is no fog.

Health = Prowess + Resistance; Initiative = Prowess + Cunning; resource capacity = Cunning + Resistance. Initiative determines combat turn order. Each class uses Resources in combat. **Character** shows the named build and derived values.

Warriors, Rogues, and Clerics roll Melee with Prowess + Combat. Wizards roll Magic with Prowess + Lore. All attacks roll against the slime's current Defense pool. Each 8–10 is a success. An original 10 keeps its success and grants one bonus die, which never chains. Ones do nothing. Ties favor the defender; positive margin is damage. Slimes attack against Resistance + Combat. Zero damage is valid. **Roll details** shows original and bonus dice in the order attacks resolved. Victory fully heals the hero and removes only that slime.

Before the first action, both sides roll initiative. The player rolls Prowess + Cunning. Slimes start with 3 initiative dice and gain one each level. The roll is capped at 1,024 dice. Most successes go first, followed by highest raw Initiative on a tie, then the player on an exact tie. **Turn Order** stays visible for the encounter. Player actions resolve at the player's place in the order. A lethal hit skips the defeated combatant's turn. If the slime goes first and the player survives a hit while choosing Run, the player escapes with the damage they took.

A Warrior starts each encounter at zero Resources and gains one on each Melee and each hit that deals damage. **Momentum** costs one Resource per existing stack before adding a new stack. Each stack adds one die to later Melee and Defense rolls, up to 1,024 dice per pool. **Execute** immediately defeats a target whose remaining Health is below the Warrior's Resources. Both Resources and Momentum clear when the encounter ends.

A Wizard starts each encounter at full Resources. **Nuke** spends one Resource to deal Cunning + Lore direct damage without rolling. **Study** reserves a chosen amount for Shield, which absorbs up to that amount on each hit. Use **Release Shield** on a later turn to return the reserved points.

A Rogue starts or Restarts at zero Resources, carries their balance between encounters, and enters combat with at least one Resource. Each Melee adds an Exploit stack, even on a miss. **Exploit** requires a stack and first place in Turn Order. Convert all stacks to Resources up to the cap, then deal direct damage equal to the resulting balance. **Prepare** spends one Resource to add an initiative success and rerank Turn Order for the next round.

Clerics start or Restart with half of maximum Resources, rounded up. **Heal** rolls Resistance + Lore to restore one HP per success, up to current Resources and missing HP, then spends one Resource. **Smite** uses the same pool for direct damage, up to the unused capacity, then restores one Resource. The one-point change still happens on zero successes. Heal is available above zero Resources and Smite below maximum. Victory and escape carry the resulting Resources into the next encounter.

## Saves and limits

The current game upgrades supported Iteration 5–12 rosters to v12. Characters created before classes existed become Warriors. Existing Warriors and Wizards keep their classes. Builds, adventures, and earned advancement carry over. Iteration 5 characters begin at player level 1 and 0 XP. Refresh older tabs so future play uses the upgraded roster.

Saves remain browser/device-local and do not sync. Clearing browser data loses them. Main and acceptance use distinct keys. Every write uses a browser Web Lock and re-reads current data; different characters' updates merge, while an outdated tab stops saving a changed/deleted character. A deleted character is never recreated by stale autosave.

Creation, deletion, Restart and confirmed roster reset require a successful write. Failed creation keeps its draft; other failures retain the relevant screen and allow retry/back. Gameplay can continue in memory after autosave failure with a warning and Retry save. Leaving unsaved progress requires confirmation. Browsers without usable storage/locks cannot create/delete/Restart, but readable active characters can resume read-only. Unreadable combined saves offer a separately confirmed reset rather than silently clearing progress.

## Advancement

A slime victory earns XP equal to the slime's level. Every 5 XP grants a player level and one advancement point. Open **Character** during exploration to spend a point on any Attribute or Skill, or bank it for later. Ratings can rise above their creation cap. Raising maximum Health leaves current Health unchanged until the next heal.

After clearing all three slimes, select **Find more slimes** to start another wave one slime level higher on the same map. Slimes start with 3 Health and 3d10 for Attack, Defense, and Initiative, then gain one in each per level. Reload preserves the wave level and placements. Restart after defeat restores the original level 1 wave and full Health while preserving player levels, XP and points. If an autosave fails, use **Retry save** before spending a point, finding more slimes or restarting.

For phone acceptance, clear wave 1, choose Find more slimes and check the next battle shows level 2 and 4 Health. A victory now awards 2 XP, taking a fresh character to player level 2. Reload and confirm the wave and progress remain saved. Lose a fight, choose Restart, and check that the original slimes return at level 1 while player advancement stays intact.

## Iteration 5 manual acceptance

1. Create two different builds and worlds; move/fight, return, Resume each, refresh, and confirm separate positions, Health and slain slimes.
2. Test both allocation budgets/floors/caps, Combat 0, long/Unicode names, Back/Cancel and refresh during creation. Cancelled drafts never consume a slot.
3. Fill ten slots: creation disables, while View/Resume/Restart remain available. Delete confirmation must name the target; Keep character preserves it. Confirm deletion and create a replacement. Duplicate names must not target the wrong slot.
4. Lose, refresh and confirm Defeated persists. Restart restores the same build/world/placements and full Health with no penalty. Other characters stay unchanged. Clearing all three slimes remains resumable.
5. Use two tabs: create at nine slots, progress different characters, then try the same character. No eleventh slot, unrelated lost progress or deleted-slot resurrection. Changed deletion/reset targets require fresh confirmation.
6. Test unavailable/quota-limited storage, mutation retry, unreadable saves/reset, and unsaved return/cancel/discard. No operation claims successful saving when it failed.
7. On a phone in portrait/landscape, check long roster scrolling, details, creation, keyboard focus, touch targets and announcements. Return to characters remains reachable by vertical scrolling. Name entry must not move the hero.
8. Older saves start with an empty new roster; main/acceptance progress remains isolated.

## Hosting

GitHub Pages serves `/SimpleRpg/` and pinned `/SimpleRpg/acceptance/`. Checks run on pushes/PRs. Publish game repeats checks, builds both paths and deploys after success. `ACCEPTANCE_REF` stores the acceptance commit; manual input can override it. See [acceptance hosting](docs/superpowers/acceptance-hosting.md).

With Playwright Chromium installed, run `node scripts/verify-deployment.mjs https://natebuwalda.github.io/SimpleRpg/ [expected-main-entry]`. The verifier exercises independent roster slots, higher-wave XP and reload, all four classes, turn order, the class actions, class Resource rules, and separation between the main and acceptance saves.
