import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Job, type Pipeline, job, pipeline, render } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

/** One job, so each field reads as the body it produces rather than as a whole document. */
const deployText = (fields: Omit<Job, "name">): string =>
  bare(pipeline({ jobs: [job({ name: "deploy", script: "true", ...fields })] }));

/** The indices of each needle, so a test can spell an order out without repeating the YAML. */
const orderOf = (text: string, needles: readonly string[]): readonly number[] =>
  needles.map((needle) => text.indexOf(needle));

describe("job rules", () => {
  const rules = [
    { if: "$CI_COMMIT_TAG", when: "never" },
    {
      if: "$CI_COMMIT_BRANCH",
      changes: { paths: ["src/**/*", "go.mod"], compare_to: "main" },
      exists: ["Dockerfile"],
      when: "on_success",
      allow_failure: true,
      variables: { DEPLOY: "true", SHARDS: 4 },
      needs: ["prepare", "lint"],
    },
  ] as const;

  it("writes every rule key and keeps the author's rule order", () => {
    expect(parse(deployText({ rules })).deploy.rules).toStrictEqual(rules);
  });

  it("keeps the documented key order inside one rule", () => {
    const text = deployText({
      rules: [
        {
          if: "$CI_COMMIT_BRANCH",
          changes: { paths: ["src/**/*"], compare_to: "main" },
          exists: ["Dockerfile"],
          when: "manual",
          allow_failure: true,
          variables: { DEPLOY: "true" },
          needs: ["build"],
        },
      ],
    });

    const keys = ["if:", "changes:", "exists:", "when:", "allow_failure:", "variables:", "needs:"];
    const indexes = orderOf(text, keys);

    expect(indexes).toStrictEqual([...indexes].toSorted((a, b) => a - b));
    expect(text.indexOf("compare_to:")).toBeGreaterThan(text.indexOf("paths:"));
  });

  it("accepts the plain path list form of changes", () => {
    expect(parse(deployText({ rules: [{ changes: ["src/**/*"] }] })).deploy.rules).toStrictEqual([
      { changes: ["src/**/*"] },
    ]);
  });

  it("emits no key for a rule with no condition", () => {
    expect(parse(deployText({ rules: [{}] })).deploy.rules).toStrictEqual([{}]);
  });
});

describe("job needs", () => {
  it("writes job names and need maps in author order", () => {
    const needs = [
      "prepare",
      { job: "lint", optional: true, artifacts: false },
      {
        job: "build",
        optional: false,
        artifacts: true,
        parallel: {
          matrix: [
            { GO_VERSION: "1.26", SHARD: 1 },
            { GO_VERSION: "1.27", SHARD: 2 },
          ],
        },
      },
    ] as const;

    const text = deployText({ needs });
    const parsed = parse(text).deploy;

    expect(parsed.needs).toStrictEqual(needs);
    expect(text.indexOf("- prepare")).toBeLessThan(text.indexOf("- job: lint"));
    expect(text.indexOf("- job: lint")).toBeLessThan(text.indexOf("- job: build"));
    expect(text.indexOf("optional: false")).toBeLessThan(text.indexOf("artifacts: true"));
    expect(text.indexOf("artifacts: true")).toBeLessThan(text.indexOf("parallel:"));
  });

  it("preserves matrix row and key order", () => {
    const text = deployText({ needs: [{ job: "test", parallel: { matrix: [{ B: 2, A: 1 }] } }] });

    expect(text.indexOf("B:")).toBeLessThan(text.indexOf("A:"));
  });

  it("does not diagnose a need that may come from an include", () => {
    expect(() =>
      render(
        pipeline({ jobs: [job({ name: "build", script: "true", needs: ["from-an-include"] })] }),
      ),
    ).not.toThrow();
  });
});

describe("rules and needs golden", () => {
  it("pins both arrays on bytes, in author order", async () => {
    const text = bare(
      pipeline({
        jobs: [
          job({
            name: "deploy",
            stage: "deploy",
            needs: [
              "prepare",
              { job: "build", optional: true, artifacts: false },
              {
                job: "test",
                parallel: {
                  matrix: [
                    { GO_VERSION: "1.26", SHARD: 1 },
                    { GO_VERSION: "1.27", SHARD: 2 },
                  ],
                },
              },
            ],
            rules: [
              { if: "$CI_COMMIT_TAG", when: "never" },
              {
                if: "$CI_COMMIT_BRANCH",
                changes: { paths: ["src/**/*"], compare_to: "main" },
                exists: ["Dockerfile"],
                when: "manual",
                allow_failure: true,
                variables: { DEPLOY: "true" },
                needs: ["build"],
              },
            ],
            script: "make deploy",
          }),
        ],
      }),
    );

    await expect(text).toMatchFileSnapshot("__snapshots__/rules-needs.yml");
  });
});
