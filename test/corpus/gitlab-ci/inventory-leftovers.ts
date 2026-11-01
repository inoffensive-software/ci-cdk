import { job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

import type { InventoryDocument } from "./inventory.js";

/**
 * The last shapes the vocabulary gained: the typed job-input map and the two map forms of a
 * function reference. They live in their own document so the main inventory stays under the line
 * budget; the gate unions every document's key paths, so the split changes no coverage.
 */
export const LEFTOVER_DOCUMENTS: readonly InventoryDocument[] = [
  {
    name: "leftovers",
    pipeline: pipeline({
      include: [
        {
          remote: "https://example.com/ci-rules.yml",
          rules: [{ changes: { regexp: "^ci/.*\\.ya?ml$" } }],
        },
      ],
      workflow: {
        rules: [
          {
            changes: { paths: ["docs/**/*"], compare_to: "main" },
            auto_cancel: { on_new_commit: "conservative", on_job_failure: "none" },
          },
          { changes: { regexp: "^docs/.*\\.md$" } },
          { changes: ["README.md"] },
        ],
      },
      jobs: [
        job({
          name: "inputs",
          stage: "build",
          script: "deploy",
          inputs: {
            environment: {
              type: "string",
              options: ["staging", "production"],
              regex: "^[a-z]+$",
              description: "The environment this job deploys to",
              default: "staging",
            },
            retries: { type: "number", default: 2 },
            dry_run: { type: "boolean", default: false },
            targets: { type: "array", default: ["api", "web"] },
          },
        }),
        job({
          name: "rule-shapes",
          stage: "build",
          script: "true",
          rules: [
            {
              when: "manual",
              changes: { regexp: "^src/.*\\.ts$" },
              start_in: "5 minutes",
              needs: ["prepare", { job: "lint", artifacts: false, optional: true }],
              interruptible: true,
            },
          ],
        }),
        job({
          name: "functions-map",
          stage: "build",
          run: [
            {
              name: "git_function",
              func: {
                git: {
                  url: "https://gitlab.com/group/functions",
                  rev: "main",
                  dir: "steps",
                  file: "func.yml",
                },
              },
            },
            {
              name: "oci_function",
              func: {
                oci: {
                  registry: "registry.gitlab.com",
                  repository: "group/functions/release",
                  tag: "1.0.0",
                  dir: "/steps/release",
                  file: "func.yml",
                },
              },
            },
          ],
        }),
      ],
    }),
  },
];
