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
      include: { local: ".gitlab/ci/test.yml" },
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
              { local: ".gitlab/ci/child.yml" },
              { project: "group/child", ref: "main", file: "ci/child.yml" },
              {
                component: "gitlab.com/components/child@1.0",
                inputs: { CHILD_ENV: "staging" },
              },
            ],
            strategy: "mirror",
          },
          parallel: 2,
          retry: 2,
          timeout: "10 minutes",
          interruptible: false,
          allow_failure: true,
          resource_group: "releases",
          coverage: "/total coverage/",
        }),
        // `include` takes at most three entries, so the template and remote shapes need a second job.
        job({
          name: "child-remote",
          trigger: {
            include: [{ template: "Child.yml" }, { remote: "https://example.com/child.yml" }],
          },
        }),
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
];
