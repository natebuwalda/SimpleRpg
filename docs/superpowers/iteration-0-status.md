# Iteration 0 implementation status

Implemented natively from the approved design and plan on November 16, 2026.

- Preview: https://natebuwalda.github.io/SimpleRpg/
- PR: https://github.com/natebuwalda/SimpleRpg/pull/1
- Implementation branch: `codex/iteration-0`; merge into `main` authorized by the owner.
- Tested implementation commit: `b0378086107812d9a4ec84d902291430abf4109f`.
- Initial successful deployment: https://github.com/natebuwalda/SimpleRpg/actions/runs/44017294204

## Plan outcomes

1. Project shell, strict TypeScript, generated woodland art: implemented.
2. One-tile exploration, collision, touch/keyboard input: implemented.
3. Attack/Run, retaliation, victory/defeat, return/restart: implemented.
4. Versioned validated saves, Continue, overwrite confirmation, storage failure recovery: implemented.
5. Mobile layouts and whole-loop browser verification: implemented and verified in emulation.
6. CI and public Pages preview: deployed and verified. The owner completed all physical-phone acceptance checks and accepted Iteration 0.

## Evidence

`npm run typecheck`, `npm test` (39 tests), and `npm run test:e2e` (22 tests, building production output first) pass. Browser tests cover touch, keyboard, collision, held/rapid commands, visibility changes, cross-tab title saves, confirmation, corrupt/unavailable storage, defeat/restart, victory persistence, and 320x568, 390x844, 844x390 viewports. `git diff --check` is clean.

One independent reviewer reproduced held input crossing the battle lock, stale title overwrite from another tab, and lost keyboard focus after attacking. Regression tests failed before the fixes and passed afterward; the whole suite passed after the fixes. No reviewer findings remain deferred. The held-Space case was also checked and already behaved correctly.

GitHub's push and PR checks passed for the implementation commit. The initial Publish game workflow succeeded. A separate Chromium check against the actual hosted URL completed touch exploration, two-turn victory, refresh/Continue, restored HP, and movement across the cleared encounter. No runtime errors or failed requests were observed.

The Phaser bundle is approximately 362 KB compressed. Vite reports its standard large-chunk advisory; no build error occurred. The browser suite emits environment color-variable notices. A Windows-owned preview server initially hung during teardown after assertions passed; the final setup builds first, reuses the local preview server, and disables reuse in CI. Final local and hosted checks exited successfully.

## Decisions and tradeoffs

- Used the matching local checkout on a feature branch because this chat lacks cloud execution tools. The published cloud environment was ready, and GitHub origin verified baseline `2241f1f`. Cost: cloud tools were not exercised; source is available on the pushed branch.
- Used PowerShell-native ledger bookkeeping on this Windows host instead of Bash task helpers. Cost: manual task bookkeeping; commits and this report preserve outcomes.
- Saved the healed victory checkpoint while the victory message is visible, following the design over an ambiguous plan phrase. Cost: refresh skips that transient message and resumes exploration.
- Used `/SimpleRpg/` from the start and tested built output rather than the development server. Cost: one small production build per browser suite; catches hosting-path errors.
- Enabled a temporary deployment trigger and Pages environment allowance for `codex/iteration-0` alongside `main`. This supplies a preview without a merge. Cost: the branch controls the single preview until its trigger/policy is removed when merged. Pages uses GitHub Actions; visibility and main contents were not changed.
- Treated lost keyboard focus as an important control failure rather than deferring it as cosmetic. Cost: small focus-restoration logic and a regression test; keyboard play now continues after turn resolution.
- The reviewer could not judge live deployment or physical-phone acceptance. Deployment was subsequently verified independently, and the owner subsequently reported all physical-phone checks passed. Both acceptance requirements are now satisfied.

## Physical-phone acceptance

Open the preview in the browser you intend to use. Tap New Game, move right four times and down twice, Attack twice, return to the clearing, refresh, and Continue. Confirm that health is restored and you can move onto the cleared slime tile. Also rotate the phone and check that controls remain accessible. Browser saves belong to that browser/device; offline loading and cross-device syncing are outside Iteration 0.

The owner accepted the work and explicitly authorized merging PR #1. The temporary feature-branch Pages trigger is removed as part of merge preparation; releases use main. Remove the temporary feature-branch Pages environment policy during merge handoff, preserving the main policy.
