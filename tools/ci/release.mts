import { job, render, step, workflow } from "../../dist/github-actions/index.js";

/**
 * The publish pipeline, written with the DSL the repository ships.
 * `tools/ci/check-workflow.sh` regenerates `.github/workflows/release.yml` from this file and fails
 * when the committed copy drifts, so edit here and regenerate rather than editing the YAML.
 *
 * npm trusted publishing exchanges the job's OIDC token for a short-lived credential, which is why
 * the job needs `id-token: write` and no repository secret.
 */
const TAG_MATCH_CHECK = [
  "version=$(node -p \"require('./package.json').version\")",
  'if [ "${GITHUB_REF_NAME}" != "v${version}" ]; then',
  '  echo "error: tag ${GITHUB_REF_NAME} does not match package version v${version}" >&2',
  "  exit 1",
  "fi",
].join("\n");

const release = workflow({
  name: "Release",
  on: { push: { tags: ["v*"] }, workflow_dispatch: {} },
  permissions: { contents: "read", "id-token": "write" },
  jobs: [
    job({
      id: "publish",
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 20,
      steps: [
        step({ uses: "actions/checkout@v4" }),
        step({ uses: "pnpm/action-setup@v4" }),
        step({
          uses: "actions/setup-node@v4",
          with: { "node-version-file": ".node_version", cache: "pnpm" },
        }),
        step({ name: "Install", run: "pnpm install --frozen-lockfile" }),
        step({ name: "Check", run: "bash tools/ci/ci.sh" }),
        step({ name: "Verify tag matches package version", run: TAG_MATCH_CHECK }),
        step({ name: "Publish", run: "npm publish --provenance --access public" }),
      ],
    }),
  ],
});

process.stdout.write(render(release));
