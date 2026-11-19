# Iteration 4 implementation status

Branch: `codex/iteration-4`, based on accepted Iteration 3 main `cb4d1e87779807f0cb2b24996c5bdf249353fd1d`.

Implemented the accepted three-step name/allocation/review flow, immutable completed builds, v5 adventure saves with strict historical migration, custom Health/pools through combat and Restart, and the named read-only Character disclosure. No runtime dependencies or hosting changes. Roster management remains Iteration 5; leveling and other deferred RPG systems remain out of scope.

## Verification

- TypeScript typecheck passed.
- 168 unit tests passed, including allocation budgets/bounds, canonical names, snapshot independence, Combat-0 and 7-Health builds, session rules, historical save validation and serialized save operations.
- 73 Playwright tests passed against the production build. Coverage includes creation/cancellation/refresh, focus and composition-event handling, physical double-click/held-pointer confirmation guards, simultaneous starts, stale-tab protection, two-tab overwrite changes, custom-build battles/Restart, v4 upgrades and blocked writes, existing camera/input/save scenarios, and 320×568 / 390×844 / 844×390 layouts with larger fallback text.
- Production builds passed; the existing Phaser bundle-size advisory remains.
- Inspected 320px Review and expanded Character screenshots: long names wrap, primary navigation remains reachable and sheets scroll vertically.
- Combined local deployment smoke passed with the accepted Iteration 3 main build and new Iteration 4 acceptance build: both title flows work, save/Continue remains isolated, the main entry script is unchanged and no asset/runtime failures occurred. The verifier shares the browser allocation helper and uses Node 24's TypeScript support.
- One independent whole-branch review found two save-loss risks and one keyboard-focus regression. Each was reproduced before its fix and verified in one fix pass: confirmation requires a fresh gesture; all save writers serialize with a final checkpoint comparison; a stale active tab cannot replace newer data; and Begin restores movement focus. No Minor findings were reported. GitHub CI and draft-PR handoff follow local verification. No deployment or merge performed.

## Execution decisions and limits

The approved native checkout/feature branch was reused. Bash orchestration scripts are unavailable on this host, so the plan-scoped task briefs and evidence were maintained manually; that carries a bookkeeping omission risk.

Review-driven decisions: overwrite confirmation has a 300 ms fresh-gesture guard, imposing a brief delay to prevent click-through. Persistent writes use per-namespace browser Web Locks with a final canonical-checkpoint comparison; stale active adventures stop autosaving and ask the player to reload. Without functioning locks the player may Continue/play, but changes cannot be persisted and the warning remains visible. No server or lock data is added to the save format.

Roster/import/leveling remain deferred and unavailable in this iteration. Automated composition and Chromium checks do not establish physical IME, assistive-technology speech or phone behavior; those remain owner acceptance work.

## Owner handoff

Deployment, physical-phone acceptance and merge await owner direction. The [README](../../README.md) contains the manual checklist. The published main and acceptance games still serve their previously deployed versions until a deployment is requested.
