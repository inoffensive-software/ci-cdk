import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Pipeline, job, pipeline, render } from "./index.js";

/**
 * The delivery and scheduling half of the format lock. `format-lock.test.ts` pins the pipeline
 * skeleton, the quoting traps and the global order; this file pins the two blocks that only exist
 * once those keys are set, so no modelled field is left without a golden.
 */

/** Header suppressed, the way every golden in this file renders. */
const bare = (value: Pipeline): string => render(value, { header: "" });

/** Every default key set, so the default block's fixed order is pinned on bytes. */
const defaults = (): Pipeline =>
  pipeline({
    default: {
      image: { name: "golang:1.26", entrypoint: [""], pull_policy: "if-not-present" },
      services: ["postgres:16", { name: "redis:7", alias: "cache" }],
      tags: ["gitlab-org"],
      before_script: ["make deps"],
      after_script: "echo done",
      cache: { key: { files: ["go.sum"], prefix: "go-" }, paths: [".cache/go"], policy: "pull" },
      artifacts: { paths: ["dist/"], when: "always", reports: { junit: ["report.xml"] } },
      retry: { max: 2, when: ["runner_system_failure"], exit_codes: [137] },
      timeout: "1h 30m",
      interruptible: true,
    },
    jobs: [],
  });

/** The two delivery blocks, kept out of the builder so it stays one keyword per line. */
const ENVIRONMENT = {
  name: "production",
  url: "https://example.com",
  action: "start",
  on_stop: "stop-production",
  auto_stop_in: "1 week",
  deployment_tier: "production",
} as const;

const RELEASE = {
  tag_name: "$CI_COMMIT_TAG",
  description: "Release $CI_COMMIT_TAG",
  name: "Release $CI_COMMIT_TAG",
  ref: "main",
  milestones: ["v1.0"],
  released_at: "2026-01-01T00:00:00Z",
} as const;

/** Every delivery and scheduling key set, so the job's fixed order is pinned on bytes. */
const jobTail = (): Pipeline =>
  pipeline({
    stages: ["build", "deploy"],
    jobs: [
      job({
        name: "deploy",
        stage: "deploy",
        extends: ".base",
        needs: ["build", { job: "test", optional: true, artifacts: false }],
        rules: [{ if: "$CI_COMMIT_TAG", when: "never" }, { changes: ["ci/**/*"] }],
        tags: ["docker"],
        image: { name: "alpine:3.20", entrypoint: [""], pull_policy: "always" },
        services: [{ name: "postgres:16", alias: "db" }],
        variables: { DEPLOY: "true" },
        cache: { key: { files: ["go.sum"] }, paths: [".cache/go"], policy: "push" },
        artifacts: { paths: ["dist/"], when: "on_success" },
        before_script: ["make deps"],
        script: "make deploy",
        after_script: "echo done",
        environment: ENVIRONMENT,
        release: RELEASE,
        trigger: {
          project: "group/downstream",
          branch: "main",
          strategy: "depend",
          inputs: { DEPLOY_ENV: "staging" },
        },
        parallel: { matrix: [{ VERSION: "1.26", SHARD: 1 }] },
        retry: { max: 2, when: ["runner_system_failure"], exit_codes: [137] },
        timeout: "1h 30m",
        interruptible: true,
        allow_failure: { exit_codes: [1, 137] },
        when: "on_success",
        resource_group: "deploy",
        coverage: "/Coverage: \\d+\\.\\d+/",
      }),
    ],
  });

/** Every golden this file pins, rendered exactly as its snapshot holds it. */
const GOLDENS = {
  "format-defaults.yml": () => bare(defaults()),
  "format-job-tail.yml": () => bare(jobTail()),
} satisfies Record<string, () => string>;

/**
 * The byte contract, restated for these two fixtures. Neither emits a block scalar, so a blank line
 * is always layout; `format-lock.test.ts` owns the block-scalar-aware form of this check.
 */
const contractViolations = (text: string): readonly string[] => {
  const violations: string[] = [];
  const body = text.endsWith("\n") ? text.slice(0, -1) : text;

  if (text.includes("\r")) {
    violations.push("a carriage return");
  }

  if (!text.endsWith("\n")) {
    violations.push("no trailing newline");
  }

  if (text.endsWith("\n\n")) {
    violations.push("more than one trailing newline");
  }

  if (body.split("\n").some((line) => line.trim() === "")) {
    violations.push("a blank line");
  }

  if (/[{}[\]]/u.test(text.replaceAll("{}", "").replaceAll("[]", ""))) {
    violations.push("flow style that is not empty");
  }

  return violations;
};

describe("goldens", () => {
  it.each(Object.entries(GOLDENS))("pins %s", async (file, emit) => {
    await expect(emit()).toMatchFileSnapshot(`__snapshots__/${file}`);
  });
});

describe("delivery and scheduling ordering", () => {
  it("emits the default block in the spec's order", () => {
    expect(Object.keys(parse(bare(defaults())).default)).toStrictEqual([
      "image",
      "services",
      "tags",
      "before_script",
      "after_script",
      "cache",
      "artifacts",
      "retry",
      "timeout",
      "interruptible",
    ]);
  });

  it("emits the job's keys in the spec's order", () => {
    expect(Object.keys(parse(bare(jobTail())).deploy)).toStrictEqual([
      "stage",
      "extends",
      "needs",
      "rules",
      "tags",
      "image",
      "services",
      "variables",
      "cache",
      "artifacts",
      "before_script",
      "script",
      "after_script",
      "environment",
      "release",
      "trigger",
      "parallel",
      "retry",
      "timeout",
      "interruptible",
      "allow_failure",
      "when",
      "resource_group",
      "coverage",
    ]);
  });
});

describe("byte contract", () => {
  it.each(Object.entries(GOLDENS))("%s is LF only, one newline, no blank lines", (_file, emit) => {
    expect(contractViolations(emit())).toStrictEqual([]);
  });

  it.each(Object.entries(GOLDENS))("%s renders identically twice", (_file, emit) => {
    expect(emit()).toBe(emit());
  });
});
