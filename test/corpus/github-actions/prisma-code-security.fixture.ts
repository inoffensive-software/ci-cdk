import { type Workflow, job, step, workflow } from "../../../src/github-actions/index.js";

const PRISMA_PERMISSIONS = { contents: "read", "pull-requests": "write" } as const;

const SEMGREP_RUN: string =
  'BASELINE_ARG=""\n' +
  'if [ -n "${{ github.event.pull_request.base.sha }}" ]; then\n' +
  '  BASELINE_ARG="--baseline-commit ${{ github.event.pull_request.base.sha }}"\n' +
  "fi\n" +
  "semgrep scan --severity ERROR --error --sarif --config auto --exclude-rule javascript.express.security.express-wkhtml-injection.express-wkhtmltoimage-injection --exclude-rule javascript.express.security.audit.remote-property-injection.remote-property-injection . --output=semgrep-results.sarif $BASELINE_ARG\n";

const POST_SARIF_RUN: string =
  "cat semgrep-results.sarif | reviewdog -f=sarif -reporter=github-pr-review\n";

const PRISMA_ARTIFACT_IF =
  "always() && github.event.pull_request != null && hashFiles('semgrep-results.sarif') != ''";

/** The code-security pipeline: a container job, job permissions, and an inherited-secrets `uses` job. */
export const PRISMA_CODE_SECURITY: Workflow = workflow({
  name: "PR Code Security",
  on: { pull_request: { branches: ["main"] } },
  jobs: [
    job({
      id: "secret-detection",
      name: "Secret Detection",
      if: "github.event_name == 'pull_request'",
      permissions: PRISMA_PERMISSIONS,
      uses: "prisma/.github/.github/workflows/secret_detection.yml@main",
      secrets: "inherit",
    }),
    job({
      id: "code-scanning",
      name: "Code Scanning / semgrep",
      "runs-on": "ubuntu-latest",
      container: { image: "semgrep/semgrep:1.147.0" },
      if: "(github.event_name == 'pull_request' && github.actor != 'dependabot[bot]')",
      permissions: PRISMA_PERMISSIONS,
      steps: [
        step({
          name: "Checkout repository",
          uses: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
          with: { "fetch-depth": 0 },
        }),
        step({ name: "Perform Semgrep Analysis", run: SEMGREP_RUN }),
        step({
          name: "Save SARIF results as artifact",
          if: PRISMA_ARTIFACT_IF,
          uses: "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
          with: { name: "semgrep-results.sarif", path: "semgrep-results.sarif" },
        }),
        step({
          name: "Setup Reviewdog",
          if: "always() && github.event.pull_request != null",
          uses: "reviewdog/action-setup@d8a7baabd7f3e8544ee4dbde3ee41d0011c3a93f",
        }),
        step({
          name: "Post SARIF to PR",
          if: PRISMA_ARTIFACT_IF,
          env: { REVIEWDOG_GITHUB_API_TOKEN: "${{ secrets.GITHUB_TOKEN }}" },
          run: POST_SARIF_RUN,
        }),
      ],
    }),
  ],
});
