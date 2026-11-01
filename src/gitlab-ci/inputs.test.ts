import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { type Job, type Pipeline, job, pipeline, render, toDoc } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

const withInputs = (inputs: NonNullable<Job["inputs"]>): string =>
  bare(pipeline({ jobs: [job({ name: "deploy", script: "true", inputs })] }));

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

describe("job inputs", () => {
  const inputs = {
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
  } as const;

  it("writes all four input types and keeps the author's input order", () => {
    const parsed = parse(withInputs(inputs)).deploy;

    expect(parsed.inputs).toStrictEqual(inputs);
    expect(Object.keys(parsed.inputs)).toStrictEqual([
      "environment",
      "retries",
      "dry_run",
      "targets",
    ]);
  });

  it("keeps the documented key order inside one declaration", () => {
    const text = withInputs({ environment: inputs.environment });

    const indexes = ["type:", "options:", "regex:", "description:", "default:"].map((key) =>
      text.indexOf(key),
    );

    expect(indexes).toStrictEqual([...indexes].toSorted((left, right) => left - right));
  });

  it("emits only `default` for a minimal input, leaving GitLab's string type implicit", () => {
    const text = withInputs({ name: { default: "world" } });

    expect(parse(text).deploy.inputs).toStrictEqual({ name: { default: "world" } });
    expect(text).not.toContain("type:");
  });
});

describe("job inputs at the edges", () => {
  it("emits an empty map when the author declares no inputs", () => {
    expect(parse(withInputs({})).deploy.inputs).toStrictEqual({});
  });

  it("refuses `inputs` through raw, because the field now carries the keyword", () => {
    const refused = pipeline({
      jobs: [job({ name: "deploy", script: "true", raw: { inputs: { name: { default: "x" } } } })],
    });

    expect(
      diagnosticsOf(() => toDoc(refused)).map(({ path, message }) => ({ path, message })),
    ).toStrictEqual([
      {
        path: '$.jobs[0].raw["inputs"]',
        message: 'raw key "inputs" is already emitted at this level',
      },
    ]);
  });
});
