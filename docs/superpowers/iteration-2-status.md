# Iteration 2 implementation status

Implemented natively on `codex/iteration-2`, based on accepted Iteration1 main `6057b5d`. Owner approved the design and implementation plan on November17,2026. Independent review is complete with no actionable findings. [Draft PR #3](https://github.com/natebuwalda/SimpleRpg/pull/3) contains the implementation. The owner subsequently authorized the exploratory deployment recorded below; the PR remains unmerged.

## Delivered behavior

- New Game chooses the existing independent20–40 world dimensions and exactly three distinct random slime positions on traversable, non-starting tiles. Stationary placements are saved with stable IDs.
- Entering a living slime starts the existing battle. Victory heals the hero and clears only that encounter; Run preserves it. Remaining counts3/2/1/0 reflect independent completion, and the clearing is peaceful only at zero.
- Restart after defeat retains world/positions, restores full HP/start, and revives all three. New Game replaces world/progress after confirmation. Camera/battle rules and input behavior are unchanged.
- Version3 checkpoints retain all three placements and per-ID completion. Older v1/v2 saves are validated under their original rules, preserve the original slime and its progress, and gain two placements away from start/current hero.
- Keys are read v3→v2→v1 only on absence; corrupt/unsupported present keys do not fall back. Each older key must contain its matching schema version. Original keys remain recovery copies.
- A migration cache keyed by exact source key/raw content prevents rerolls during repeated title actions when v3 writes fail. Continue remains playable with a warning. If storage writes remain blocked across a full reload, new placements may differ because the previous upgrade could not be persisted.

## Verification

- `npm run typecheck`: PASS.
- `npm test`:125/125 PASS across8 files.
- `npm run test:e2e`: production build and40/40 browser scenarios PASS, retaining all30 accepted scenarios with schema/fixture adaptations.
- `git diff --check`: PASS.
- Phone screenshots before/after defeating slime2 inspected: only slime2 disappears, slime1 remains, and count3→2 matches state. Full playthrough kills2/1/3, preserves partial progress on reload, and reaches zero. Existing320x568,390x844,844x390 layout/rotation checks pass.

Test-first evidence includes generation/save failures before implementation, four independent encounter failures before identity binding, remaining-count browser failures before UI changes, a migration-cache regression that failed with the cache disabled, and a wrong-key/schema regression before loader correction. Final full suite passed after all changes.

Two native runs encountered Windows/OneDrive EBUSY only while closing Playwright trace files, on different tests. The output directory now defaults to OS temporary `simple-rpg-playwright`, with optional `PLAYWRIGHT_OUTPUT_DIR` override; the final suite exited0. Explicit screenshots remain in ignored test-results. The pre-existing Phaser bundle-size advisory remains (approximately363KB gzip); no packages were added.

## Implementation decisions and tradeoffs

1. Used the matching native checkout on a feature branch because this chat has no cloud shell. Cost: execution was local rather than on the published cloud machine.
2. Added save-validation.ts for shared pure validation and retained older-format checks in legacy-save.ts. Cost: one small helper module, avoiding diverging health/geometry restrictions.
3. Added slime-generation/slime-save tests plus shared fixtures while retaining old validation coverage. Cost: additional test files.
4. Random New Game verification checks generation/reload at spawn; deterministic fixtures verify navigation/scrolling. Random adjacent slimes make assumed safe routes invalid. Cost: the random-world test no longer walks an arbitrary hard-coded enemy-free route.
5. Moved Playwright traces/results to OS temporary storage after repeated OneDrive locks. Cost: trace paths are outside the checkout; screenshots stay under test-results and location is configurable.

6. The reviewer set invalid injected RNG values/malformed internal preserved arguments aside because they are outside the helper contract. Kept that boundary: production uses Math.random and validated old saves. Cost: a future internal caller must honor those contracts.
7. The reviewer set identical migration placements across full reloads with blocked writes aside as explicitly excluded by the plan. Kept the documented session-only guarantee. Cost: an unpersisted upgrade may choose different added placements after reload.
8. The reviewer could not judge hosted deployment or physical-phone acceptance. Kept both as explicit owner-directed release steps. Cost: local/CI verification alone is not owner acceptance of the public game.

No feature-contract deviations or deferred minors.

## Independent review

One fresh-context whole-branch reviewer examined `6057b5d..accdde4` against the approved spec/plan and all five Review Focus cases. No critical, important, or minor findings warranted changes. The reviewer independently passed typecheck/range diff-check, inspected source, tests and screenshots, and did not repeat the already reported unit/browser suites. No fixes were needed. The three matters set aside by the reviewer and the executor's decisions are recorded above.

## CI layout regression

Initial GitHub Ubuntu26 checks passed typecheck,125 unit tests and the build, but two320x568 layout cases placed the bottom controls at y572. The new two-part helper text wrapped differently with Linux fallback-font metrics. A native regression with18px monospace description text reproduced an overflow to y583. Shortening the helper copy to `Explore the clearing.` kept the remaining count visible and made that regression pass. The full native suite then passed125 unit and40 browser tests, typecheck, build and diff-check. This small follow-up is covered by that regression and CI rather than another independent review. Current remote CI status is available on the draft PR.

## Release and acceptance boundary

The public game at https://natebuwalda.github.io/SimpleRpg/ now hosts the authorized Iteration2 exploratory preview; main remains accepted Iteration1. Owner phone acceptance and merge authorization remain pending. Automatic publishing stays main-only. The feature branch has a temporary Pages environment allowance for manual preview deployments; remove it on merge. No workflow triggers were changed and no credentials were copied into cloud files/messages.

## Exploratory deployment

The owner authorized exploratory testing. Native GitHub credentials added the exact `codex/iteration-2` deployment-branch allowance alongside main, then dispatched the existing manual Publish game workflow for `8f8d644b52f51ae96ba933b1fe71fdf9e952a584`. Checks, build and deployment succeeded: https://github.com/natebuwalda/SimpleRpg/actions/runs/44147780480 .

A Chromium check against the actual public URL generated a26x33 world with three distinct traversable, non-start placements. It verified Run, all three independent victories and remaining counts3/2/1/0, exact world/partial progress after reload, the peaceful message at zero, and Restart restoring the same original placements after a low-HP defeat fixture. No failed requests or runtime errors occurred. The hosted phone-sized screenshot was inspected.

For phone exploration, New Game starts with all three slimes. Continue preserves earlier progress: migrating an older save whose original slime was defeated correctly leaves two living slimes until Restart. Defeated slimes remain gone after reload. Restart is available after defeat and restores the same three placements.
