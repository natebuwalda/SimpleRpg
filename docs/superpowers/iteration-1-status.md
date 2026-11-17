# Iteration 1 implementation status

Implemented on `codex/iteration-1` from approved planning commit `9f516c8`, based on accepted Iteration 0 main `f8d8677`. Implementation uses the published SimpleRpg cloud checkout, native execution, and no implementer subagents.

## Implemented behavior

- Two independent random dimensions, each uniformly selected from integer20–40, saved with world layout/version.
- Fixed10×10 view,16px logical tiles, immediate minimal scrolling with three visible tiles ahead, no fog, and a three-tile impassable forest border.
- World-aware collision, landmarks, reachable far slime, and preserved battle/checkpoint rules. Restart resets the same world.
- Validated v2 checkpoints under `simple-rpg.save.v2`. Original v1 saves migrate into legacy-expanded20×20, translating hero/landmarks(+2,+2), preserving HP/completion and the v1 recovery copy. Present invalid v2 never falls back to v1. Migration write failures retain playable in-memory Continue and a warning.
- Accessible world size and displayed row/column ranges; camera state remains stable through reversal, collision, battle return, and rotation.

## Verification environment and adjustments

Cloud Node24.22.1 with lockfile dependencies; no package changes. No AGENTS.md found. Available cloud execution/TDD/verification skills were read; local Windows/helper scripts were unavailable, so the approved repository plan and an ignored manual ledger were used.

Bundled Playwright Chromium download returned403 from the restricted download host. Production browser verification uses installed Chromium156 through the optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` override. CI retains default bundled Chromium. Baseline typecheck and39 unit tests passed;21/22 browser scenarios passed initially and the held-pointer timing case passed in isolation.

Longer24-tap battle routes and52-tap edge walks exceeded the old30s scenario budget under four-worker load, with correct checkpoint snapshots; scenario budget is now60s, with120s for the full52-tap edge walk. Held-pointer and held-Space tests freeze and advance the resolution clock to guarantee that input begins during the300ms busy window. All22 accepted browser scenarios remain.

Phone screenshots at spawn and far corner were inspected: correct hero/slime tile alignment, three-tile border, no blank outside-world space, and controls visible at320×568,390×844 and844×390.

## Release boundary

Public Pages remains accepted Iteration 0 until an authorized release. Work stops at feature commits and a draft PR. Main-only automatic Pages trigger and `/SimpleRpg/` base remain unchanged. No merge, feature deployment, or production change is authorized by this implementation handoff.

After authorization: merge/release, verify hosted assets and large-world play/reload, then owner phone acceptance of scrolling and all four edges. Iteration 1 is implemented for review; it is not yet released or owner-accepted.

## Final local checks

- `npm run typecheck` — PASS.
- `npm test` —82/82 PASS across5 files.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` — production build and30/30 browser scenarios PASS (all22 accepted scenarios plus8 expanded-world scenarios).
- `git diff --check` — PASS.

The build retains the pre-existing Phaser bundle-size warning; no additional packages or deployment workflow changes were introduced.

## Independent review

One fresh-context whole-branch review of `f8d8677..9ee70b8` checked the full approved spec/plan and all five Review Focus cases. Result: no critical, important, or minor findings; nothing declined to judge. No implementer subagents or per-task reviews were used.

## Implementation rulings

1. Used the dedicated cloud checkout and requested feature branch for isolation. Tradeoff: less directory isolation inside this cloud instance than an extra worktree.
2. Used installed Chromium through a temporary cloud config when the bundled download was blocked. Tradeoff: a different Chromium version from CI.
3. Added the optional executable-path override so the normal browser-test npm script works here. Tradeoff: users opting into it may run a different Chromium; default CI remains unchanged.
4. Allowed60s per browser scenario and120s for the full edge walk, based on traces showing correct movement exhausting the previous budget. Tradeoff: a stalled scenario can take30–90s longer to fail.
5. Used a controlled resolution clock for held-input browser tests to remove the automation-latency race. Tradeoff: these cases exercise virtual timer advancement rather than real wall-clock duration; input events remain real.

Deferred minors: none. No feature contract deviations.
