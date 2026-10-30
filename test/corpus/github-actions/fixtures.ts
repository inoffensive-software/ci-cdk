import { type Workflow, job, step, workflow } from "../../../src/github-actions/index.js";

/**
 * The definition each vendored config must reproduce, one named export per entry. It lives here
 * rather than in the test so the coverage-debt ledger can walk every fixture in one place.
 *
 * Steps whose shell command is a single line upstream use `raw.run`: the modelled `run` field always
 * emits a literal block, which changes the bytes. See `coverage-debt.ts`.
 */
export const got: Workflow = workflow({
  name: "CI",
  on: ["push", "pull_request"],
  permissions: { contents: "read" },
  jobs: [
    job({
      id: "test",
      name: "Node.js ${{ matrix.node-version }} on ${{ matrix.os }}",
      "runs-on": "${{ matrix.os }}",
      strategy: {
        "fail-fast": false,
        matrix: {
          "node-version": [26, 24, 22],
          os: ["ubuntu-latest"],
        },
      },
      steps: [
        step({ uses: "actions/checkout@v7" }),
        step({
          uses: "actions/setup-node@v7",
          with: { "node-version": "${{ matrix.node-version }}" },
        }),
        step({ raw: { run: "npm install" } }),
        step({ raw: { run: "npm run test" } }),
      ],
    }),
  ],
});
