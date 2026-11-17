# Acceptance hosting

Owner request: deploy Iteration 3 at a different URI from the main game. Use the existing GitHub Pages hosting and native checkout.

Production stays at `https://natebuwalda.github.io/SimpleRpg/`. The latest acceptance build lives at `https://natebuwalda.github.io/SimpleRpg/acceptance/`. Both are public. Acceptance has separate browser save and migration keys, so testing cannot overwrite or migrate production progress.

Pages deploys one complete artifact. The Publish game workflow therefore builds `main` at the root and a pinned acceptance commit under `acceptance/`. The `ACCEPTANCE_REF` repository variable remembers the acceptance commit for subsequent releases; manual workflow input can select a revision for that deployment. Pin the variable to a tested full commit SHA, so deleting a feature branch after merge does not break the preview. Future main deployments retain that pinned acceptance build once this workflow change is merged.

The current main workflow predates this change; until this PR is merged, a main deployment using that older workflow would remove the acceptance directory. Deploying through this updated workflow restores both builds. This deployment does not merge the application PR.

Execution: first prove save-key isolation with unit tests; implement isolated keys and the combined deployment workflow; run typecheck/unit/browser regressions; build and serve the combined artifact locally and test both paths/storage; push, pin the acceptance commit, temporarily allow the exact feature branch in the Pages environment, dispatch, verify both live paths, and remove the temporary permission.

Main deployment before this change: `ba10362a7ff716da54d000ff46922fa341bc3c7f`, entry script `/SimpleRpg/assets/index-B19wwBiG.js`. Verify the production entry script remains unchanged after acceptance deployment.

Local verification: namespace tests failed before implementation; all 150 unit tests, typecheck and 50 existing browser tests now pass. `scripts/verify-deployment.mjs` rejects the old single-build artifact, then passes against the combined artifact: main shows Iteration 02 and 12 Health, acceptance shows Iteration 03 and 5 Health, acceptance starts without reading the main save, both Continue independently, no main save is modified, and no asset/runtime errors occur. The main entry script is identical to the published version.

Deployed on 2026-11-17 from pinned acceptance commit `5ebafc3489f6fbb084ba734102215e93a62fe968` in [Publish game run 44189245377](https://github.com/natebuwalda/SimpleRpg/actions/runs/44189245377). Checks, build and deploy all succeeded. The same smoke script passed against both live URLs, with unchanged main entry script `index-B19wwBiG.js`, separate saves and no asset/runtime failures. The exact temporary `codex/iteration-3` deployment policy was removed after verification; only main remains permitted. PR #4 remains unmerged and awaits owner phone acceptance.
