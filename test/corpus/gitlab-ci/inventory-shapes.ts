import { job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

import type { InventoryDocument } from "./inventory.js";
import { LEFTOVER_DOCUMENTS } from "./inventory-leftovers.js";

/**
 * The second inventory document: the other shape each field accepts. A single `include` entry is a
 * map, a single `cache` is a map, a retry count is a scalar, and an image or service can be a bare
 * string; each shape adds paths of its own to the modelled set. The last document is the runtime and
 * release nesting, whose nested maps exist only in their map form.
 */
export const ALTERNATE_DOCUMENTS: readonly InventoryDocument[] = [
  ...LEFTOVER_DOCUMENTS,
  {
    name: "shapes",
    pipeline: pipeline({
      default: {
        image: "golang:1.26",
        services: ["docker:24.0.7-dind"],
        before_script: ["echo one"],
        after_script: "echo after",
        cache: {
          key: { files: ["go.sum"], files_commits: ["go.sum"], prefix: "go-" },
          paths: [".cache/go"],
          policy: "pull",
          unprotect: true,
          untracked: false,
          when: "on_success",
          fallback_keys: ["go-main"],
        },
        retry: 2,
      },
      include: {
        local: ".gitlab/ci/test.yml",
        rules: [
          {
            changes: { paths: ["ci/**/*"], compare_to: "main" },
            exists: { paths: ["ci/test.yml"], project: "group/shared", ref: "main" },
            when: "always",
          },
          { exists: { regexp: "^ci/.*\\.yml$" } },
          { exists: ["ci/test.yml"] },
        ],
        inputs: { target: { value: "release", expand: false }, jobs: 2 },
      },
      jobs: [
        job({
          name: "release",
          stage: "build",
          script: "make release",
          when: "delayed",
          start_in: "1 hour",
          environment: "review/prod",
          trigger: {
            include: [
              { local: ".gitlab/ci/child.yml", inputs: { CHILD_ENV: "staging" } },
              {
                project: "group/child",
                ref: "main",
                file: "ci/child.yml",
                inputs: { CHILD_ENV: { value: "staging", description: "child env" } },
              },
              {
                component: "gitlab.com/components/child@1.0",
                inputs: { CHILD_ENV: "staging" },
              },
            ],
            strategy: "mirror",
            forward: { yaml_variables: false },
          },
          parallel: 2,
          retry: 2,
          timeout: "10 minutes",
          interruptible: false,
          allow_failure: true,
          resource_group: "releases",
          coverage: "/total coverage/",
        }),
        // `include` takes at most three entries, so the remaining shapes need another job.
        job({
          name: "child-remote",
          trigger: {
            include: [
              { template: "Child.yml", inputs: { CHILD_ENV: "staging" } },
              {
                remote: "https://example.com/child.yml",
                inputs: {
                  CHILD_ENV: "staging",
                  MATRIX: [{ value: "a" }, { value: "b" }],
                  GRID: [[{ value: "g" }]],
                },
              },
              {
                artifact: "generated/child.yml",
                job: "generate",
                inputs: { CHILD_ENV: "staging" },
              },
            ],
            forward: { pipeline_variables: true },
          },
        }),
        // The schema also accepts one path as a scalar, which is not an entry map.
        job({ name: "child-path", trigger: { include: "ci/child.yml", strategy: "depend" } }),
        // The other `inherit` shapes, plus the manual confirmation text.
        job({
          name: "confirm",
          inherit: { default: false, variables: ["DEPLOY"] },
          when: "manual",
          manual_confirmation: "Deploy $CI_COMMIT_TAG to production?",
        }),
        // `run` is a job's alternative to `script`: a function step may carry inputs and env, and a
        // script step is the documented escape hatch. Modelled here without raw.
        job({
          name: "functions",
          stage: "build",
          run: [
            { name: "validate", func: "registry.gitlab.com/js/validate:1.0.0" },
            {
              name: "release",
              func: "registry.gitlab.com/js/release:1.0.0",
              inputs: { environment: "production", retries: 2 },
              env: { BUILD_TARGET: "release" },
            },
            { name: "migrate", script: "npm run migrate", env: { DRY_RUN: "false" } },
          ],
        }),
      ],
    }),
  },
  // The map form of `include` has its own schema branch: one entry for each source, with rules and
  // inputs, so every shape is reachable without raw.
  {
    name: "include-remote",
    pipeline: pipeline({
      include: {
        remote: "https://example.com/nested.yml",
        cache: "30 minutes",
        integrity: `sha256-${"A".repeat(43)}=`,
        rules: [
          { if: "$CI_COMMIT_BRANCH", exists: ["nested.yml"] },
          { changes: ["nested.yml"], when: "always" },
          { changes: { regexp: "^nested/.*\\.yml$" }, when: "never" },
        ],
        inputs: { target: "release" },
      },
      jobs: [],
    }),
  },
  {
    name: "include-template",
    pipeline: pipeline({
      include: {
        template: "Nested.gitlab-ci.yml",
        rules: [{ when: "never" }],
        inputs: { target: "release" },
      },
      jobs: [],
    }),
  },
  {
    name: "include-project",
    pipeline: pipeline({
      include: {
        project: "group/project",
        ref: "main",
        file: ["nested/one.yml", "nested/two.yml"],
        rules: [{ if: "$CI_COMMIT_TAG" }],
        inputs: { target: "release" },
      },
      jobs: [],
    }),
  },
  {
    name: "include-component",
    pipeline: pipeline({
      include: {
        component: "gitlab.com/components/nested@1.0",
        rules: [{ if: "$CI_COMMIT_BRANCH" }],
        inputs: {
          scalar: "value",
          object: { value: "release", expand: false, description: "the target" },
          rows: [{ value: "a" }, { value: "b" }],
          grid: [[{ value: "x" }], [{ value: "y" }]],
          nested: [[1, 2], [3]],
        },
      },
      jobs: [],
    }),
  },
  {
    name: "artifacts-access",
    pipeline: pipeline({
      default: { artifacts: { access: "developer" } },
      jobs: [job({ name: "access", artifacts: { access: "all", untracked: true } })],
    }),
  },
  // The runtime and release nesting: executor options under an image and a service, the pull policy
  // as a single value and as a list, the Kubernetes half of an environment, and a release's assets
  // and tag message. Every shape is reachable through a field, so no `raw` is needed.
  {
    name: "runtime",
    pipeline: pipeline({
      default: {
        image: {
          name: "golang:1.26",
          entrypoint: [""],
          docker: { platform: "arm64/v8", user: "dave" },
          kubernetes: { user: "1001:1001" },
          pull_policy: ["always", "if-not-present"],
        },
        services: [
          "postgres:16",
          {
            name: "super/sql:experimental",
            docker: { platform: "arm64/v8", user: "dave" },
            kubernetes: { user: 1001 },
            pull_policy: ["always", "never"],
          },
        ],
      },
      jobs: [
        job({
          name: "runtime",
          image: {
            name: "super/sql:experimental",
            docker: { platform: "arm64/v8", user: "dave" },
            kubernetes: { user: 1001 },
            pull_policy: ["always", "never"],
          },
          services: [
            "postgres:16",
            {
              name: "redis:7",
              docker: { platform: "arm64/v8", user: "dave" },
              kubernetes: { user: "1001:1001" },
              pull_policy: ["always", "if-not-present"],
            },
          ],
          environment: {
            name: "production",
            kubernetes: {
              agent: "path/to/agent/project:agent-name",
              namespace: "production",
              flux_resource_path:
                "helm.toolkit.fluxcd.io/v2/namespaces/gitlab-agent/helmreleases/gitlab-agent",
              managed_resources: { enabled: true },
              dashboard: {
                namespace: "production-dashboard",
                flux_resource_path: "flux-system/gitops-toolkit",
              },
            },
          },
          release: {
            tag_name: "$CI_COMMIT_TAG",
            tag_message: "Annotated tag message",
            description: "Release $CI_COMMIT_TAG",
            assets: {
              links: [
                {
                  name: "asset1",
                  url: "https://example.com/assets/1",
                  filepath: "/pretty/url/1",
                  link_type: "other",
                },
                { name: "asset2", url: "https://example.com/assets/2" },
              ],
            },
          },
        }),
        // The scalar pull policy and an image with no executor options still emit on their own.
        job({
          name: "runtime-minimal",
          image: { name: "alpine:3.20", pull_policy: "always" },
          services: [{ name: "postgres:16" }],
          environment: "production",
          release: { tag_name: "v1", description: "Release v1" },
        }),
      ],
    }),
  },
];
