import { type Workflow, job, step, workflow } from "../../../src/github-actions/index.js";

const MLFLOW_PATHS = [
  "mlflow/server/js/**",
  ".github/actions/check-component-ids/**",
  ".github/actions/js-build-cache-key/**",
  ".github/actions/setup-node/**",
  ".github/workflows/js.yml",
];

const MLFLOW_CONTENTS_READ = { contents: "read" } as const;

const MLFLOW_CHECKOUT = step({
  uses: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  with: { "persist-credentials": false },
});

const MLFLOW_JOB_DEFAULTS = { run: { "working-directory": "mlflow/server/js" } } as const;

const MLFLOW_TEST_RUN: string =
  '"$GITHUB_WORKSPACE/dev/profile.sh" \\\n' +
  "  yarn test --silent --maxWorkers=2 $MATRIX_OPTION src/experiment-tracking/components\n";

const MLFLOW_MASTER_PUSH = "github.event_name == 'push' && github.ref == 'refs/heads/master'";

export const MLFLOW_JS: Workflow = workflow({
  name: "JS",
  on: {
    workflow_dispatch: {},
    push: { paths: MLFLOW_PATHS, branches: ["master", "branch-[0-9]+.[0-9]+"] },
    pull_request: { paths: MLFLOW_PATHS },
  },
  concurrency: {
    group: "${{ github.workflow }}-${{ github.event_name }}-${{ github.ref }}",
    "cancel-in-progress": true,
  },
  defaults: { run: { shell: "bash" } },
  permissions: {},
  "cache-mode": "none",
  jobs: [
    job({
      id: "check-component-ids",
      permissions: MLFLOW_CONTENTS_READ,
      "timeout-minutes": 5,
      "runs-on": "ubuntu-slim",
      steps: [
        MLFLOW_CHECKOUT,
        step({
          name: "Check componentId registry",
          uses: "./.github/actions/check-component-ids",
        }),
      ],
    }),
    job({
      id: "js",
      permissions: MLFLOW_CONTENTS_READ,
      "timeout-minutes": 30,
      strategy: {
        "fail-fast": false,
        matrix: { option: ["--testPathPattern", "--testPathIgnorePatterns"] },
      },
      "runs-on": "ubuntu-24.04",
      defaults: MLFLOW_JOB_DEFAULTS,
      steps: [
        MLFLOW_CHECKOUT,
        step({ uses: "./.github/actions/setup-node" }),
        step({ name: "Install dependencies", run: "yarn install --immutable\n" }),
        step({ name: "Run lint", run: "yarn lint\n" }),
        step({ name: "Run prettier", run: "yarn prettier:check\n" }),
        step({ name: "Run extract-i18n lint", run: "yarn i18n:check\n" }),
        step({ name: "Run type-check", run: "yarn type-check\n" }),
        step({
          name: "Run tests",
          env: { MATRIX_OPTION: "${{ matrix.option }}" },
          run: MLFLOW_TEST_RUN,
        }),
        step({
          name: "Upload profile metrics",
          if: "always()",
          uses: "actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9",
          with: {
            name: "profile-metrics-${{ strategy.job-index }}",
            path: "/tmp/profile-metrics.csv",
            "retention-days": 3,
            "if-no-files-found": "ignore",
          },
        }),
      ],
    }),
    job({
      id: "build",
      permissions: MLFLOW_CONTENTS_READ,
      "cache-mode": "write-only",
      "runs-on": "ubuntu-24.04",
      "timeout-minutes": 30,
      defaults: MLFLOW_JOB_DEFAULTS,
      steps: [
        MLFLOW_CHECKOUT,
        step({ uses: "./.github/actions/setup-node" }),
        step({
          if: MLFLOW_MASTER_PUSH,
          id: "cache-key",
          uses: "./.github/actions/js-build-cache-key",
        }),
        step({ run: "yarn install --immutable\n" }),
        step({ run: "yarn build\n" }),
        step({
          if: MLFLOW_MASTER_PUSH,
          uses: "actions/cache/save@55cc8345863c7cc4c66a329aec7e433d2d1c52a9",
          with: {
            path: "mlflow/server/js/build",
            key: "${{ steps.cache-key.outputs.key }}",
          },
        }),
      ],
    }),
  ],
});
