import { type Workflow, job, step, workflow } from "../../../src/github-actions/index.js";

const UV_POLICY_IF = "github.repository == 'astral-sh/uv' && github.ref == 'refs/heads/main'";

const UV_POLICY_RUNS_ON =
  "${{ github.repository_owner == 'astral-sh' && 'github-ubuntu-24.04-x86_64-2' || 'ubuntu-slim' }}";

const UV_POLICY_PERMISSIONS = "issues: write\npull_requests: write\n";

export const UV_AI_POLICY: Workflow = workflow({
  name: "AI policy",
  on: {
    workflow_dispatch: {
      inputs: {
        issue: { description: "An issue number", required: false, type: "number" },
        pull_request: { description: "A pull request number", required: false, type: "number" },
        head_sha: {
          description: "The pull request head SHA supplied by the dispatcher",
          required: false,
          type: "string",
        },
        label: {
          description: "The applied policy label",
          required: true,
          type: "choice",
          options: ["bot:ai-policy-comment", "bot:ai-policy-close"],
        },
      },
    },
  },
  permissions: {},
  concurrency: {
    group: "${{ github.workflow }}-${{ inputs.issue || inputs.pull_request }}",
    "cancel-in-progress": false,
  },
  jobs: [
    job({
      id: "apply",
      if: UV_POLICY_IF,
      "runs-on": UV_POLICY_RUNS_ON,
      environment: { name: "automations", deployment: false },
      "timeout-minutes": 5,
      permissions: { "id-token": "write" },
      steps: [
        step({
          name: "Get policy token",
          id: "token",
          uses: "astral-sh/github-actions/simple-token-service@eb81cf4d13127c3f9539f621c17e4c65327636c8",
          with: {
            "exchange-url": "${{ secrets.STS_API_URL }}/exchange",
            audience: "${{ secrets.STS_API_URL }}",
            repository: "${{ github.repository }}",
            permissions: UV_POLICY_PERMISSIONS,
          },
        }),
        step({
          name: "Apply AI policy",
          uses: "astral-sh/github-actions/ai-policy@610c50be70008f185dfde2683cbfe7c4b3927e7d",
          with: {
            token: "${{ steps.token.outputs.token }}",
            number: "${{ inputs.issue || inputs.pull_request }}",
            label: "${{ inputs.label }}",
          },
        }),
      ],
    }),
  ],
});
