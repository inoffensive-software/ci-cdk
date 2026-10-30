import { job, render, step, workflow } from "../../dist/github-actions/index.js";

/**
 * This repository's own pipeline, written with the DSL the repository ships.
 * `tools/ci/check-workflow.sh` regenerates `.github/workflows/ci.yml` from this file and fails when
 * the committed copy drifts, so edit here and regenerate rather than editing the YAML.
 *
 * The steps stay thin on purpose: the branching lives in `tools/ci/ci.sh`.
 */
const ci = workflow({
  name: "CI",
  on: { push: { branches: ["main"] }, pull_request: {} },
  permissions: { contents: "read" },
  concurrency: { group: "ci-${{ github.ref }}", "cancel-in-progress": true },
  jobs: [
    job({
      id: "check",
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 20,
      steps: [
        step({ uses: "actions/checkout@v4" }),
        step({ uses: "pnpm/action-setup@v4" }),
        step({
          uses: "actions/setup-node@v4",
          with: { "node-version-file": ".node_version", cache: "pnpm" },
        }),
        step({ name: "Check", run: "bash tools/ci/ci.sh" }),
      ],
    }),
  ],
});

process.stdout.write(render(ci));
