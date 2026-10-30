import { type Workflow, job, step, workflow } from "../../../src/github-actions/index.js";

const RELEASE_ENV = {
  TURBO_TOKEN: "${{ secrets.TURBO_TOKEN }}",
  TURBO_TEAM: "${{ vars.TURBO_TEAM }}",
  NPM_CONFIG_PROVENANCE: true,
};

const REQUIRE_ADMIN = step({
  name: "Require a repo admin",
  env: {
    GH_TOKEN: "${{ github.token }}",
    ACTOR: "${{ github.triggering_actor }}",
  },
  run:
    'permission=$(gh api "repos/${GITHUB_REPOSITORY}/collaborators/${ACTOR}/permission" --jq .permission)\n' +
    'if [ "$permission" != "admin" ]; then\n' +
    "  echo \"::error::Only repo admins can publish stable releases (${ACTOR} has '${permission}')\"\n" +
    "  exit 1\n" +
    "fi\n",
});

const CHECKOUT = step({
  name: "Checkout repo",
  uses: "actions/checkout@v7",
  with: { "fetch-depth": 0, token: "${{ secrets.ACCESS_TOKEN }}" },
});

const CONFIGURE_GIT = step({
  name: "Configure git",
  run:
    'git config --global user.email "github-actions[bot]@users.noreply.github.com"\n' +
    'git config --global user.name "github-actions[bot]"\n',
});

const SETUP = step({ uses: "./.github/setup" });

/** The release pipeline: dispatch choice inputs, a workflow environment, and filtered push paths. */
export const TRPC_RELEASE: Workflow = workflow({
  name: "Release Packages",
  on: {
    workflow_dispatch: {
      inputs: {
        dist_tag: {
          description: "NPM distribution tag",
          required: true,
          type: "choice",
          default: "latest",
          options: ["latest", "canary"],
        },
        version_bump: {
          description: "Version bump type",
          required: true,
          type: "choice",
          options: ["patch", "minor"],
        },
      },
    },
    push: {
      branches: ["main"],
      paths: [
        ".github/setup/*",
        ".github/workflows/release.yml",
        "packages/**",
        "!packages/**/package.json",
        "!packages/test/**",
      ],
    },
  },
  permissions: {
    contents: "write",
    "id-token": "write",
    "pull-requests": "write",
  },
  env: RELEASE_ENV,
  jobs: [
    job({
      id: "publish",
      if: "github.event_name == 'workflow_dispatch' && inputs.dist_tag == 'latest'",
      "timeout-minutes": 10,
      "runs-on": "ubuntu-latest",
      environment: "npm-publish",
      steps: [
        REQUIRE_ADMIN,
        CHECKOUT,
        CONFIGURE_GIT,
        SETUP,
        step({
          name: "Publish packages",
          run:
            "pnpm lerna publish ${{ inputs.version_bump }} --force-publish " +
            "--dist-tag ${{ inputs.dist_tag }} --yes\n",
        }),
      ],
    }),
    job({
      id: "publish-canary",
      if: "github.event_name == 'push' || inputs.dist_tag == 'canary'",
      "timeout-minutes": 10,
      "runs-on": "ubuntu-latest",
      environment: "npm-publish",
      steps: [
        CHECKOUT,
        CONFIGURE_GIT,
        SETUP,
        step({
          run:
            "pnpm lerna publish --force-publish --canary --preid canary " +
            "--dist-tag canary --yes",
        }),
      ],
    }),
  ],
});
