# Iteration 5: Character roster and ten playthroughs

Status: mockup accepted; written design pending owner approval.

## Intent and agreed scope

Let players create up to ten characters, each with an independent resumable adventure, and switch between them without overwriting progress. This supersedes the earlier Iteration 4 proposal of reusable character templates and one adventure slot.

Owner decisions:

- Creating a character immediately starts a new playthrough and adds its slot to the roster.
- Maximum ten slots. At ten, creation is blocked but existing adventures can resume and defeated characters can Restart.
- Characters cannot be edited. Viewing and confirmed deletion are included.
- Restart after defeat has no penalty: same character/build/map/slime placements, full derived Health, all encounters reset, same starting position as today.
- This is a breaking save change. Do not preserve, migrate, or auto-import earlier saves or characters.
- Combined storage holds the roster and all adventures. Each character has their own resumable adventure, rather than a separate reusable template.
- The owner accepted the phone roster, character details, full-capacity and deletion-confirmation mockups.

No leveling, XP, classes, specializations, gear, resource spending, import/export, accounts, cross-device synchronization, or additional battle/map systems. No separate character creation without starting an adventure. Existing allocation and dice rules remain unchanged.

## Approaches

We considered storing the roster and current adventure separately versus one combined save. The owner selected combined storage so adding a character and beginning its playthrough is a single saved change. Subsequent discussion expanded that choice to ten independent playthroughs in the combined save.

Reusable templates with one replaceable adventure were considered and superseded by ten resumable adventures. External creation/import remains deferred. The existing browser stack, native checkout and main/acceptance hosting remain in use; no runtime dependency or hosting changes are proposed.

## Screens and flow

The roster replaces the single-save title controls. Show Your adventures, a used-slots counter, New Character, and one entry per slot. Entries show name, current Health or Defeated, defeated-slime count, Resume (Restart if defeated), and View. Keep insertion order stable; returning from play does not reorder entries. No automatic entry into the last played adventure on page load.

New Character opens the existing three-step Attributes/name, Skills, Review allocation flow, starting from empty name and base ratings. Back retains the temporary draft; Cancel or refresh discards it without consuming a slot. Begin adventure validates the build and current capacity, generates a fresh world, and atomically saves the new slot before entering play. It never overwrites an existing slot or asks to replace an adventure. If another tab filled the final slot, keep the draft with an explanatory message and allow returning to the roster; do not create an eleventh slot.

At ten slots disable New Character and explain that a character must be deleted to make room. Resume, View, Delete and Restart remain available. An empty roster invites creation. Names retain Iteration 4 validation (trimmed, nonblank, maximum 24 UTF-16 code units), attributes base 1 plus exactly 5 points, skills base 0 plus exactly 5 points, maximum rating 5. Combat 0 remains valid. Derived stats and allocation warnings remain as before.

View opens a read-only character/adventure summary with name, current Health/status, slime count, all attributes/skills and the existing derived stats/pools. Provide Resume/Restart, Back and Delete character. No edit action. Author choice: duplicate names are permitted; slots have stable unique internal IDs, never name-based identity.

Delete character opens a separate confirmation naming that character and clearly stating that both character and saved adventure will be deleted permanently. Keep character is the safe primary action. Cancellation changes nothing. Successful deletion returns to the updated roster and frees one slot. Deleting the currently viewed character is allowed; deletion never removes a different ID after a list reorder or another tab's change. Require a fresh activation for confirmation, retaining the existing protection against double clicks and held gestures.

Resume selects the slot's own map, position, Health, build and completion. Author choice: provide Return to characters from exploration, victory and defeat; do not add a battle exit command. Returning to the roster neither resets progress nor creates a new slot. Switching always goes through the roster. During battle, retain the existing reload behavior: the last safe checkpoint resumes, with no persistence of intermediate dice/enemy Health. Victory persists completion/full healing; Run persists retained hero Health and safe position, as today. All slimes defeated remains a resumable explored map with 3/3 completion, not an automatic reset.

## Defeat and Restart

Author choice: persist a defeated status alongside the last safe checkpoint when a battle ends in defeat. Reload and selecting that slot therefore offer Restart rather than reviving it through Resume. The roster shows Defeated, and the defeat screen retains Restart plus Return to characters. Last-roll feedback is transient and need not survive reload. Persisting defeat does not change combat resolution.

Restart resets only that slot using the existing same-world reset rules, clears defeated status and preserves slot identity/order/count. It does not change ratings, reroll the map, remove another slot, consume currency, or reduce stats. No new penalty or progression system is introduced.

## Combined save and failure handling

Use a new versioned combined save key per production/acceptance namespace. Do not load any v1-v5 single-adventure key; old data may remain untouched but never appears as playable in Iteration 5. The first load without the new key displays an empty roster. There is no migration path or dependency on legacy parsing. Author choice: remove legacy loading/migration code and obsolete migration-only tests, retaining relevant geometry/progress validators and current gameplay coverage.

The combined document has an envelope version and at most ten slots. Each slot has a unique stable ID, a validated named character/adventure checkpoint and active/defeated status. Use one canonical copy of its character/build in its checkpoint, with a validated independent world/progress record. Validate IDs, uniqueness, capacity, status, point budgets, geometry, placements, position, completion and Health; reject malformed combined data rather than silently dropping slots. Planning settles the concrete schema and version numbers. Persist no DOM, transient draft, combat dice, enemy Health or global mutable character template.

Every write serializes with the existing per-namespace browser Web Lock, re-reads the latest combined save and writes the whole new document with one localStorage setItem. Creation checks capacity inside the transaction; deletion resolves by ID. An adventure update compares its own saved slot snapshot, then merges into the latest document so another character's progress or newly added slots are preserved. Changes to an unrelated slot do not invalidate active play. If the active slot changed, was reset, or was deleted elsewhere, stop stale writes and ask the player to return to the roster/reload; never recreate a deleted slot or overwrite newer progress. Re-read an existing slot when Resume is activated. Destructive confirmation must be renewed if the target slot changed while it was open; unrelated changes do not require renewed confirmation.

Author choice: creation, deletion and Restart require a successful durable write before reporting success. On write failure leave existing saved data and the creation draft/confirmation/defeat screen intact, with an actionable warning and retry/back path. No ghost slot or automatic overwrite. Normal resumed gameplay may continue in memory after an autosave failure with the existing persistent warning; returning/reloading can lose that unsaved progress, and Return to characters must warn before discarding it. Browsers without working storage or Web Locks can view readable slots and resume in warned, non-persisting play, but cannot create/delete/Restart. Do not claim a roster has been saved when it has not.

For malformed combined data, show an explicit unreadable-save state. Author choice: offer a separately confirmed Reset roster action that replaces only this namespace's combined save with an empty valid roster, with the same stale-data and write-success protections; do not silently clear invalid data or fall back to old saves. Raw-data changes while reset confirmation is open require renewed confirmation. Blocked reads do not authorize reset or replacement.

## Phone layout and accessibility

Use the accepted woodland style and screenshots. The mockup scenario buttons, sample data, phone frame and preview captions are not product UI. Long rosters and sheets scroll vertically. Keep navigation reachable, minimum 48px controls, readable names, no horizontal overflow at 320x568, 390x844 and 844x390, and support large text. Render names as text, including Unicode and punctuation.

Maintain keyboard focus across roster/detail/confirmation/creation transitions and after deletion. Keep persistent announcements for capacity changes, save failures and actions. Inputs must not trigger movement, reading details must not move the hero, and existing battle command gates and focus behavior remain intact. Restart selected from the roster enters exploration with movement focus after successful saving.

## Acceptance and builder discretion

Required verification covers ten independent worlds/progress records; create/cancel/refresh; view/resume; full capacity; deletion/cancel; defeat/reload/Restart; all-three-slimes completion; duplicate names by ID; ignored old saves; corrupted or blocked storage; failed durable mutations; two-tab final-slot races, unrelated-slot merges, changed/deleted active-slot protection and deletion/reset confirmation freshness; phone/keyboard/input regressions; and live main/acceptance save isolation when deployment is requested. Physical phone and assistive-technology acceptance remain owner checks.

Planning may settle file/module boundaries, exact schema/ID generation, save revision representation, lock naming, error wording, UI details within the accepted screens and meaningful tests. Use the existing allocation, validation, combat and map code where appropriate. Do not implement before written design and implementation plan approval. Native implementation remains the selected workflow.
