import { describe, expect, it } from "vitest";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { type Job, type Pipeline, type Script, job, pipeline, render } from "./index.js";

const diagnosticsOf = (value: Pipeline): readonly Diagnostic[] => {
  try {
    render(value);
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics;
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

const pairsOf = (value: Pipeline): readonly { path: string; message: string }[] =>
  diagnosticsOf(value).map(({ path, message }) => ({ path, message }));

const jobOf = (name: string, extra: Partial<Omit<Job, "name">> = {}): Job =>
  job({ name, script: "true", ...extra });

const ci = (jobs: readonly Job[], stages?: readonly string[]): Pipeline =>
  stages === undefined ? pipeline({ jobs }) : pipeline({ stages, jobs });

const scripted = (script: Script): Pipeline => pipeline({ jobs: [job({ name: "build", script })] });

describe("job names", () => {
  it("refuses an empty name", () => {
    expect(pairsOf(ci([jobOf("")]))).toStrictEqual([
      { path: "$.jobs[0].name", message: "job name must not be empty" },
    ]);
  });

  it("refuses a duplicate at every occurrence", () => {
    const message = 'duplicate job name "build": $.jobs[0].name and $.jobs[3].name';

    expect(
      pairsOf(ci([jobOf("build"), jobOf("test"), jobOf("deploy"), jobOf("build")])),
    ).toStrictEqual([
      { path: "$.jobs[0].name", message },
      { path: "$.jobs[3].name", message },
    ]);
  });

  it("refuses a GitLab global keyword", () => {
    expect(pairsOf(ci([jobOf("image")]))).toStrictEqual([
      {
        path: "$.jobs[0].name",
        message: 'job name "image" is a GitLab global keyword',
      },
    ]);
  });

  it("refuses a hidden template", () => {
    expect(pairsOf(ci([jobOf(".template")]))).toStrictEqual([
      {
        path: "$.jobs[0].name",
        message: 'job name ".template" is a hidden template, not a job',
      },
    ]);
  });
});

describe("stage names", () => {
  it("refuses an empty stage name", () => {
    expect(pairsOf(ci([], ["build", ""]))).toStrictEqual([
      { path: "$.stages[1]", message: "stage name must not be empty" },
    ]);
  });

  it("refuses a duplicate stage at every occurrence", () => {
    const message = 'duplicate stage "test": $.stages[1] and $.stages[3]';

    expect(pairsOf(ci([], ["build", "test", "deploy", "test"]))).toStrictEqual([
      { path: "$.stages[1]", message },
      { path: "$.stages[3]", message },
    ]);
  });
});

describe("stage membership", () => {
  it("reports an explicit stage the pipeline does not declare", () => {
    expect(pairsOf(ci([jobOf("lint", { stage: "check" })], ["build"]))).toStrictEqual([
      {
        path: "$.jobs[0].stage",
        message: 'job "lint" uses stage "check", which is not declared',
      },
    ]);
  });

  it("accepts an omitted stage even when test is not declared, because a merge may supply it", () => {
    expect(() => render(ci([jobOf("lint")], ["build", "deploy"]))).not.toThrow();
  });

  it("accepts an omitted stage when test is a default stage", () => {
    expect(() => render(ci([jobOf("lint")]))).not.toThrow();
  });
});

describe("scripts", () => {
  it("refuses an empty script string", () => {
    expect(pairsOf(scripted(""))).toStrictEqual([
      { path: "$.jobs[0].script", message: "script must not be empty" },
    ]);
  });

  it("refuses an empty script array", () => {
    expect(pairsOf(scripted([]))).toStrictEqual([
      { path: "$.jobs[0].script", message: "script must contain at least one command" },
    ]);
  });

  it("accepts a job that declares no script, as a fragment overriding an included job", () => {
    const override = pipeline({
      jobs: [job({ name: "semantic_release", raw: { rules: [{ when: "never" }] } })],
    });

    expect(() => render(override)).not.toThrow();
  });

  it("accepts a job with no script and no raw at all", () => {
    expect(() => render(pipeline({ jobs: [job({ name: "markdownlint" })] }))).not.toThrow();
  });
});

describe("collection", () => {
  it("throws one DiagnosticError carrying every problem", () => {
    const broken = pipeline({
      stages: ["build", "test", "test"],
      jobs: [
        job({ name: "", script: "" }),
        job({ name: "lint", stage: "check", script: [] }),
        job({ name: "workflow", script: "true" }),
      ],
    });

    const diagnostics = diagnosticsOf(broken);

    expect(diagnostics.map(({ path }) => path)).toStrictEqual([
      "$.stages[1]",
      "$.stages[2]",
      "$.jobs[0].name",
      "$.jobs[2].name",
      "$.jobs[1].stage",
      "$.jobs[0].script",
      "$.jobs[1].script",
    ]);
  });
});
