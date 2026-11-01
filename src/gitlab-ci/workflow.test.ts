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

  it("writes a rule's changes map with compare_to, its variables map and rule-level needs", () => {
    const text = workflowText({
      rules: [
        {
          changes: { paths: ["src/**/*"], compare_to: "main" },
          exists: ["Dangerfile"],
          variables: { DEPLOY: "true", SHARDS: 4 },
          needs: ["build"],
        },
      ],
    });

    expect(parse(text).workflow).toStrictEqual({
      rules: [
        {
          changes: { paths: ["src/**/*"], compare_to: "main" },
          exists: ["Dangerfile"],
          variables: { DEPLOY: "true", SHARDS: 4 },
          needs: ["build"],
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

describe("workflow rule auto_cancel", () => {
  it("writes a workflow rule's auto_cancel, in the documented key order", () => {
    const text = workflowText({
      rules: [
        {
          changes: { paths: ["docs/**/*"] },
          auto_cancel: { on_new_commit: "conservative", on_job_failure: "none" },
        },
      ],
    });

    expect(parse(text).workflow).toStrictEqual({
      rules: [
        {
          changes: { paths: ["docs/**/*"] },
          auto_cancel: { on_new_commit: "conservative", on_job_failure: "none" },
        },
      ],
    });
    expect(text.indexOf("auto_cancel:")).toBeGreaterThan(text.indexOf("changes:"));
  });
});
