# Iteration 3 implementation status

Branch: `codex/iteration-3`, based on accepted Iteration 2 main `ba10362`.

The approved fixed starter build, opposed nonchaining d10 pools, variable melee damage, checkpoint v4 upgrades, character details, and original/bonus roll feedback are implemented. No new dependencies were introduced. The Pages workflow now publishes the main and isolated acceptance builds together. Resources are derived read-only; spending, classes, specializations, progression and initiative scheduling remain deferred.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 150 unit tests passed, including two acceptance save-key isolation tests.
- `npm run test:e2e`: 50 browser tests passed against the production build.
- Production build: passed; the existing Phaser bundle size advisory remains.
- Screenshot inspection: 320px battle commands fit with 18px monospace description text; expanded maximum bonus results wrap without horizontal overflow. Browser layout checks also cover 390×844 and 844×390.
- Browser regression coverage includes dice results, final victory/defeat feedback, Run damage, input locks and focus, three independent slimes, camera movement, historical saves, v3 exact-placement upgrades, newest-key precedence, and blocked-write cache stability.
- Independent whole-branch review: two Important accessibility findings fixed in one pass, each with failing-then-passing browser regressions. Arrow keys now read focused details without moving the hero or replacing the disclosure; a persistent combat live region announces every turn, including identical consecutive results, without repeating unchanged save messages. No Critical or Minor findings were reported.
- Integration: [PR #4](https://github.com/natebuwalda/SimpleRpg/pull/4). Branch, PR and publication checks passed for acceptance deployment commit `5ebafc3`.

## Execution decisions

- Reused the native checkout on a new feature branch, preserving the owner's native workflow. This lacks separate-checkout isolation if concurrent edits occur.
- Maintained plan-scoped task briefs/evidence manually because Bash skill scripts were unavailable on this Windows host. Manual bookkeeping carries a risk of omissions; verification commands and commits remain recorded.
- Included the finishing counterattack on defeat as well as the finishing attack on victory. This adds one transient feedback field and no save-schema changes beyond the planned v4.
- Kept the owner's approved balance and deferred progression scope; fights vary in length and classes/leveling remain unavailable.
- Left physical-phone/speech acceptance and deployment/merge as owner release steps. Native browser and Windows accessibility-event coverage cannot establish physical-device speech or phone behavior.

## Owner acceptance and release

Native implementation and independent review fixes are complete. Local preview servers are stopped. The owner authorized acceptance deployment at [the acceptance URL](https://natebuwalda.github.io/SimpleRpg/acceptance/). During that deployment the main game remained the accepted Iteration 2 release, with its original entry script and saves unchanged. Combined-artifact and live browser checks verified separate save/Continue behavior and no asset/runtime errors. See [hosting details](acceptance-hosting.md) for the pinned revision and successful deployment run.

The owner accepted Iteration 3 and explicitly authorized merging PR #4 on 2026-11-17. The [README](../../README.md) retains the manual acceptance checklist for future regressions. Main deployments retain the separately pinned acceptance build and its isolated saves.
