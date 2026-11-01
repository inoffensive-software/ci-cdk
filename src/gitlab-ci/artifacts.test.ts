import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic, type Value } from "../core/index.js";
import { type Job, type Pipeline, job, pipeline, render, toDoc } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

/** One job, so each field reads as the body it produces rather than as a whole document. */
const body = (fields: Omit<Job, "name">): Readonly<Record<string, Value>> =>
  parse(bare(pipeline({ jobs: [job({ name: "build", ...fields })] }))).build;

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

describe("job artifacts", () => {
  it("writes every artifacts field, keeping report order and a single report path", () => {
    const artifacts = {
      paths: ["dist/"],
      exclude: ["dist/tmp/"],
      name: "build-$CI_JOB_NAME",
      expire_in: "1 week",
      expose_as: "build",
      untracked: true,
      access: "developer",
      public: false,
      when: "always",
      reports: { codequality: "gl-code-quality-report.json", junit: ["report.xml"] },
    } as const;

    const text = bare(pipeline({ jobs: [job({ name: "build", artifacts })] }));

    expect(body({ artifacts })["artifacts"]).toStrictEqual(artifacts);
    expect(text.indexOf("codequality:")).toBeLessThan(text.indexOf("junit:"));
  });

  it("writes a report as a list and coverage_report as its map in author order", () => {
    const artifacts = {
      reports: {
        sast: ["gl-sast.json", "other-sast.json"],
        coverage_report: { coverage_format: "jacoco", path: "build/jacoco.xml" },
        accessibility: "accessibility.json",
      },
    } as const;

    const text = bare(pipeline({ jobs: [job({ name: "build", artifacts })] }));

    expect(body({ artifacts })["artifacts"]).toStrictEqual(artifacts);
    expect(text.indexOf("sast:")).toBeLessThan(text.indexOf("coverage_report:"));
    expect(text.indexOf("coverage_report:")).toBeLessThan(text.indexOf("accessibility:"));
  });
});

describe("artifact report keys", () => {
  it("refuses an unknown report key through the artifacts raw collision", () => {
    const refused = pipeline({
      jobs: [
        job({
          name: "build",
          raw: { artifacts: { reports: { unknown_report: "report.json" } } },
        }),
      ],
    });

    expect(diagnosticsOf(() => toDoc(refused)).map(({ path }) => path)).toStrictEqual([
      '$.jobs[0].raw["artifacts"]',
    ]);
  });

  it("refuses an unknown report key in the typed map", () => {
    const refused = job({
      name: "build",
      // @ts-expect-error report keys are closed; an unknown one cannot be typed
      artifacts: { reports: { unknown_report: "report.json" } },
    });

    expect(refused.name).toBe("build");
  });
});
