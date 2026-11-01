import { job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

import type { InventoryDocument } from "./inventory.js";

/**
 * The nesting this slice promotes: variable object forms at every level the schema admits, cache
 * `files_commits`/`unprotect`, cross-project needs and the rule `exists` map. It is a separate
 * document so the main inventory stays within its line budget.
 */
export const NESTING_DOCUMENTS: readonly InventoryDocument[] = [
  {
    name: "nesting",
    pipeline: pipeline({
      default: {
        services: [{ name: "redis:7", variables: { REDIS_DB: { value: "1", expand: false } } }],
        cache: [
          {
            key: { files: ["go.sum"], files_commits: ["go.sum"], prefix: "go-" },
            paths: [".cache/go"],
            policy: "pull",
            unprotect: true,
          },
          {
            key: { files_commits: ["go.sum"] },
            paths: [".cache/build"],
            unprotect: false,
          },
        ],
      },
      include: [
        {
          local: ".gitlab/ci/nested.yml",
          rules: [
            { exists: { paths: ["ci.yml"], project: "group/shared", ref: "main" } },
            { exists: { regexp: "^ci/.*\\.yml$" } },
            { exists: ["ci.yml"] },
          ],
        },
      ],
      variables: {
        STABLE_VERSION: "1.5",
        TARGET: {
          value: "staging",
          expand: false,
          options: ["staging", "production"],
          description: "the environment to release",
        },
      },
      workflow: {
        rules: [
          { exists: { paths: ["Dangerfile"], project: "group/shared", ref: "main" } },
          { exists: { regexp: "^ci/.*\\.yml$" } },
          { exists: ["Dangerfile"] },
        ],
      },
      jobs: [
        job({
          name: "deploy",
          needs: [
            { job: "upstream", project: "group/upstream", ref: "main" },
            { job: "previous", pipeline: "1234", optional: true },
          ],
          rules: [
            { exists: { paths: ["Dockerfile"], project: "group/shared", ref: "main" } },
            { exists: { regexp: "^ci/.*\\.yml$" } },
            { exists: ["Dockerfile"] },
          ],
          services: [
            {
              name: "postgres:16",
              variables: { PG_DB: { value: "app", expand: false } },
            },
          ],
          variables: { DEPLOY_ENV: { value: "production", expand: true } },
          cache: {
            key: { files: ["go.sum"], files_commits: ["go.sum"], prefix: "go-" },
            paths: [".cache/go"],
            policy: "push",
            unprotect: true,
          },
          script: "make deploy",
        }),
        job({
          name: "list-cache",
          cache: [
            {
              key: { files_commits: ["go.sum"] },
              paths: [".cache/one"],
              unprotect: false,
            },
            { key: "go", paths: [".cache/two"] },
          ],
        }),
      ],
    }),
  },
];
