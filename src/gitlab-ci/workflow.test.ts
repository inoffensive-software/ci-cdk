import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { pipeline, render } from "./index.js";
import type { Workflow } from "./types.js";

const workflowText = (workflow: Workflow): string =>
  render(pipeline({ workflow, jobs: [] }), { header: "" });

describe("workflow", () => {
  it("writes the pipeline gate's name, auto-cancel policy and rules", () => {
    const text = workflowText({
      name: "merge request",
      auto_cancel: { on_new_commit: "interruptible", on_job_failure: "all" },
      rules: [
        { if: '$CI_PIPELINE_SOURCE == "merge_request_event"' },
        { if: "$CI_COMMIT_BRANCH", when: "never" },
      ],
    });

    expect(parse(text).workflow).toStrictEqual({
      name: "merge request",
      auto_cancel: { on_new_commit: "interruptible", on_job_failure: "all" },
      rules: [
        { if: '$CI_PIPELINE_SOURCE == "merge_request_event"' },
        { if: "$CI_COMMIT_BRANCH", when: "never" },
      ],
    });
  });

  it("writes a rule's changes map with compare_to and its variables map", () => {
    const text = workflowText({
      rules: [
        {
          changes: { paths: ["src/**/*"], compare_to: "main" },
          exists: ["Dangerfile"],
          variables: { DEPLOY: "true", SHARDS: 4 },
        },
      ],
    });

    expect(parse(text).workflow).toStrictEqual({
      rules: [
        {
          changes: { paths: ["src/**/*"], compare_to: "main" },
          exists: ["Dangerfile"],
          variables: { DEPLOY: "true", SHARDS: 4 },
        },
      ],
    });
  });
});

describe("workflow order", () => {
  it("writes the gate in the spec's key order", () => {
    const text = workflowText({
      rules: [{ when: "never" }, { if: "$CI_COMMIT_TAG" }],
      auto_cancel: { on_new_commit: "none" },
      name: "gate",
    });

    expect(Object.keys(parse(text).workflow)).toStrictEqual(["name", "auto_cancel", "rules"]);
    expect(parse(text).workflow.rules).toStrictEqual([{ when: "never" }, { if: "$CI_COMMIT_TAG" }]);
  });
});
