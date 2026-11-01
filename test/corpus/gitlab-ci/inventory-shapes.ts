import { job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

import type { InventoryDocument } from "./inventory.js";

/**
 * The second inventory document: the other shape each field accepts. A single `include` entry is a
 * map, a single `cache` is a map, a retry count is a scalar, and an image or service can be a bare
 * string; each shape adds paths of its own to the modelled set.
 */
export const ALTERNATE_DOCUMENTS: readonly InventoryDocument[] = [
  {
    name: "shapes",
    pipeline: pipeline({
      default: {
        image: "golang:1.26",
        services: ["docker:24.0.7-dind"],
        before_script: ["echo one"],
        after_script: "echo after",
        cache: { key: { files: ["go.sum"] }, paths: [".cache/go"] },
        retry: 2,
      },
      include: {
        local: ".gitlab/ci/test.yml",
        rules: [
          {
            changes: { paths: ["ci/**/*"], compare_to: "main" },
            exists: ["ci/test.yml"],
            when: "always",
          },
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
              { remote: "https://example.com/child.yml", inputs: { CHILD_ENV: "staging" } },
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
        integrity: `sha256-${"A".repeat(43)}=`,
        rules: [
          { if: "$CI_COMMIT_BRANCH", exists: ["nested.yml"] },
          { changes: ["nested.yml"], when: "always" },
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
];
