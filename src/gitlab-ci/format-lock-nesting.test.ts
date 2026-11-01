import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Pipeline, job, pipeline, render } from "./index.js";

/**
 * The include and trigger nesting half of the format lock. `format-lock.test.ts` pins the pipeline
 * skeleton, the quoting traps and the global order; this file pins the promoted nestings, so no new
 * include or trigger field is left without a golden.
 */

/** Header suppressed, the way every golden renders. */
const bare = (value: Pipeline): string => render(value, { header: "" });

/** Include rules and inputs, and a multi-project trigger with inputs and forward. */
const includeAndTrigger = (): Pipeline =>
  pipeline({
    include: [
      {
        local: "ci/local.yml",
        rules: [{ if: "$CI_COMMIT_BRANCH", changes: { paths: ["ci/**/*"] } }],
        inputs: { target: { value: "release", expand: false }, jobs: [1, 2] },
      },
      {
        remote: "https://example.com/ci.yml",
        integrity: `sha256-${"A".repeat(43)}=`,
        inputs: { target: "release" },
      },
    ],
    jobs: [
      job({
        name: "deploy",
        trigger: {
          project: "group/downstream",
          inputs: { TARGET: { value: "production", description: "target" } },
          forward: { yaml_variables: false, pipeline_variables: true },
        },
      }),
    ],
  });

describe("include and trigger golden", () => {
  it("pins the nesting on bytes", async () => {
    await expect(bare(includeAndTrigger())).toMatchFileSnapshot(
      "__snapshots__/format-include-trigger.yml",
    );
  });

  it("parses back to the author's shape", () => {
    expect(parse(bare(includeAndTrigger()))).toStrictEqual({
      include: [
        {
          local: "ci/local.yml",
          rules: [{ if: "$CI_COMMIT_BRANCH", changes: { paths: ["ci/**/*"] } }],
          inputs: { target: { value: "release", expand: false }, jobs: [1, 2] },
        },
        {
          remote: "https://example.com/ci.yml",
          integrity: `sha256-${"A".repeat(43)}=`,
          inputs: { target: "release" },
        },
      ],
      deploy: {
        trigger: {
          project: "group/downstream",
          inputs: { TARGET: { value: "production", description: "target" } },
          forward: { yaml_variables: false, pipeline_variables: true },
        },
      },
    });
  });
});
