import { type Workflow, job, step, workflow } from "../../../src/github-actions/index.js";

export const GOT: Workflow = workflow({
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
        step({ run: "npm install" }),
        step({ run: "npm run test" }),
      ],
    }),
  ],
});
