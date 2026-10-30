import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic, type Value } from "../core/index.js";
import { type Job, type Pipeline, job, pipeline, render, toDoc } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

/** One job, so each field reads as the body it produces rather than as a whole document. */
const body = (fields: Omit<Job, "name">): Readonly<Record<string, Value>> =>
  parse(bare(pipeline({ jobs: [job({ name: "deploy", ...fields })] }))).deploy;

const diagnosticsOf = (run: () => void): readonly Diagnostic[] => {
  try {
    run();
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics;
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

describe("job environment", () => {
  it("writes a bare environment name as a scalar", () => {
    expect(body({ environment: "production" })["environment"]).toBe("production");
  });

  it("writes the map form in GitLab's key order", () => {
    const environment = {
      name: "production",
      url: "https://example.com",
      action: "start",
      on_stop: "stop-production",
      auto_stop_in: "1 week",
      deployment_tier: "production",
    } as const;

    expect(body({ environment })["environment"]).toStrictEqual(environment);
  });

  it("keeps a numeric-looking name a string", () => {
    expect(body({ environment: "1.5" })["environment"]).toBe("1.5");
  });
});

describe("job release", () => {
  it("writes every release key and omits the absent ones", () => {
    const release = {
      tag_name: "$CI_COMMIT_TAG",
      description: "Release $CI_COMMIT_TAG",
      name: "Release $CI_COMMIT_TAG",
      ref: "main",
      milestones: ["v1.0"],
      released_at: "2026-01-01T00:00:00Z",
    } as const;

    expect(body({ release })["release"]).toStrictEqual(release);
    expect(body({ release: { tag_name: "v1", description: "one" } })["release"]).toStrictEqual({
      tag_name: "v1",
      description: "one",
    });
  });
});

describe("job parallel", () => {
  it("writes a count as a scalar", () => {
    expect(body({ parallel: 4 })["parallel"]).toBe(4);
  });

  it("writes a matrix of rows in author order, keeping each row's key order", () => {
    const parallel = {
      matrix: [
        { GO_VERSION: "1.26", SHARD: 1 },
        { SHARD: 2, GO_VERSION: "1.27" },
      ],
    } as const;

    expect(body({ parallel })["parallel"]).toStrictEqual(parallel);
  });

  it("keeps a numeric-looking cell a string and a number a number", () => {
    const parsed = body({
      parallel: {
        matrix: [{ TEXT: "1.5", NUMBER: 1.5, BOOLEAN: true }],
      },
    });

    expect(parsed["parallel"]).toStrictEqual({
      matrix: [{ TEXT: "1.5", NUMBER: 1.5, BOOLEAN: true }],
    });
  });

  it("writes a cell that holds a list of scalars", () => {
    const parallel = { matrix: [{ GO_VERSION: ["1.25", "1.26"] }] } as const;

    expect(body({ parallel })["parallel"]).toStrictEqual(parallel);
  });
});

describe("job retry", () => {
  it("writes a count as a scalar", () => {
    expect(body({ retry: 2 })["retry"]).toBe(2);
  });

  it("writes max, when and exit_codes in order", () => {
    const retry = { max: 2, when: ["runner_system_failure"], exit_codes: [137] } as const;

    expect(body({ retry })["retry"]).toStrictEqual(retry);
  });

  it("accepts a single exit code", () => {
    expect(body({ retry: { max: 1, exit_codes: 137 } })["retry"]).toStrictEqual({
      max: 1,
      exit_codes: 137,
    });
  });
});

describe("job scheduling and delivery scalars", () => {
  it("writes timeout, interruptible, when, resource_group and coverage", () => {
    expect(
      body({
        timeout: "1h 30m",
        interruptible: false,
        when: "delayed",
        resource_group: "deploy",
        coverage: "/Coverage: \\d+\\.\\d+/",
      }),
    ).toStrictEqual({
      timeout: "1h 30m",
      interruptible: false,
      when: "delayed",
      resource_group: "deploy",
      coverage: "/Coverage: \\d+\\.\\d+/",
    });
  });

  it("writes allow_failure as a boolean and as exit codes", () => {
    expect(body({ allow_failure: true })["allow_failure"]).toBe(true);
    expect(body({ allow_failure: { exit_codes: [1, 137] } })["allow_failure"]).toStrictEqual({
      exit_codes: [1, 137],
    });
    expect(body({ allow_failure: { exit_codes: 137 } })["allow_failure"]).toStrictEqual({
      exit_codes: 137,
    });
  });

  it("emits nothing for an absent field", () => {
    expect(body({ script: "true" })).toStrictEqual({ script: "true" });
  });
});

/** One job carrying every delivery key, so the fixed order is pinned without repeating a struct. */
const ordered = (): Pipeline =>
  pipeline({
    jobs: [
      job({
        name: "deploy",
        stage: "deploy",
        tags: ["docker"],
        variables: { A: "b" },
        cache: { paths: [".cache/"] },
        artifacts: { paths: ["dist/"] },
        before_script: "echo before",
        script: "make deploy",
        after_script: "echo after",
        environment: "production",
        release: { tag_name: "v1", description: "one" },
        trigger: { project: "group/downstream" },
        parallel: 2,
        retry: 1,
        timeout: "1h",
        interruptible: true,
        allow_failure: true,
        when: "manual",
        resource_group: "deploy",
        coverage: "/coverage/",
      }),
    ],
  });

describe("job emission order", () => {
  it("places every delivery and scheduling key at the spec's fixed position", () => {
    expect(Object.keys(parse(bare(ordered())).deploy)).toStrictEqual([
      "stage",
      "tags",
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

describe("job raw collisions", () => {
  it("refuses every delivery key in raw, whether or not the field is set", () => {
    const refused = pipeline({
      jobs: [
        job({
          name: "deploy",
          script: "true",
          raw: {
            environment: "production",
            release: { tag_name: "v1" },
            trigger: { project: "group/downstream" },
            parallel: 2,
            retry: 2,
            timeout: "1h",
            interruptible: true,
            allow_failure: true,
            when: "manual",
            resource_group: "deploy",
            coverage: "/coverage/",
          },
        }),
      ],
    });

    expect(diagnosticsOf(() => toDoc(refused)).map((item) => item.path)).toStrictEqual([
      '$.jobs[0].raw["environment"]',
      '$.jobs[0].raw["release"]',
      '$.jobs[0].raw["trigger"]',
      '$.jobs[0].raw["parallel"]',
      '$.jobs[0].raw["retry"]',
      '$.jobs[0].raw["timeout"]',
      '$.jobs[0].raw["interruptible"]',
      '$.jobs[0].raw["allow_failure"]',
      '$.jobs[0].raw["when"]',
      '$.jobs[0].raw["resource_group"]',
      '$.jobs[0].raw["coverage"]',
    ]);
  });
});
