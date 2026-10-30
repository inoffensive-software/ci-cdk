import { type Workflow, job, step, workflow } from "../../../src/github-actions/index.js";

const MISE_RELEASE_IF = [
  "(github.event_name == 'release' &&",
  " startsWith(github.event.release.tag_name, 'v') &&",
  " !github.event.release.prerelease) ||",
  "github.event_name == 'workflow_dispatch'",
].join("\n");

const MISE_RESOLVE_RUN = [
  "source scripts/gh-api-retry.sh",
  "",
  'TAG="${EVENT_TAG:-$INPUT_VERSION}"',
  'if ! [[ "$TAG" =~ ^v[0-9][0-9A-Za-z._+-]*$ ]]; then',
  '  echo "::error::Invalid release tag: $TAG" >&2',
  "  exit 1",
  "fi",
  "# /releases/latest is by definition the newest release that is neither",
  "# a draft nor a prerelease, so matching it proves the tag is a",
  "# published stable release without spending a second API call.",
  `LATEST_TAG="$(gh_api "repos/$GITHUB_REPOSITORY/releases/latest" --jq '.tag_name')"`,
  'if [[ "$TAG" != "$LATEST_TAG" ]]; then',
  '  echo "::error::$TAG is not the latest stable release ($LATEST_TAG)" >&2',
  "  exit 1",
  "fi",
  'echo "tag=$TAG" >>"$GITHUB_OUTPUT"',
].join("\n");

export const MISE_PUBLISH_VERSION: Workflow = workflow({
  name: "publish-version",
  on: {
    release: { types: ["published"] },
    workflow_dispatch: {
      inputs: {
        version: {
          description: "Published release tag to expose (e.g., v2026.9.3)",
          required: true,
          type: "string",
        },
      },
    },
  },
  concurrency: { group: "publish-version", queue: "max" },
  jobs: [
    job({
      id: "publish-version",
      if: `${MISE_RELEASE_IF}\n`,
      "runs-on": "ubuntu-26.04",
      "timeout-minutes": 180,
      permissions: { contents: "read" },
      steps: [
        step({
          uses: "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
          "timeout-minutes": 5,
          with: {
            "persist-credentials": false,
            ref: "${{ github.event.repository.default_branch }}",
          },
        }),
        step({
          name: "Resolve published release",
          id: "release",
          "timeout-minutes": 75,
          env: {
            EVENT_TAG: "${{ github.event.release.tag_name }}",
            GH_TOKEN: "${{ secrets.GITHUB_TOKEN }}",
            INPUT_VERSION: "${{ inputs.version }}",
          },
          run: `${MISE_RESOLVE_RUN}\n`,
        }),
        step({
          name: "Publish VERSION and purge release caches",
          "timeout-minutes": 75,
          env: {
            GH_TOKEN: "${{ secrets.GITHUB_TOKEN }}",
            CLOUDFLARE_ACCESS_KEY_ID: "${{ secrets.CLOUDFLARE_ACCESS_KEY_ID }}",
            CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_TOKEN }}",
            CLOUDFLARE_SECRET_ACCESS_KEY: "${{ secrets.CLOUDFLARE_SECRET_ACCESS_KEY }}",
          },
          run: './scripts/publish-version.sh "${{ steps.release.outputs.tag }}"',
        }),
      ],
    }),
  ],
});
