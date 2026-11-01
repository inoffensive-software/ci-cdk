import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { type Job, type Pipeline, job, pipeline, render } from "./index.js";

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

const withJob = (value: Job): Pipeline => pipeline({ jobs: [value] });

const FUNCTION_JOB = job({
  name: "build",
  stage: "build",
  run: [
    {
      name: "validate",
      func: "registry.gitlab.com/js/validate:1.0.0",
      env: { BUILD_TARGET: "release" },
    },
    {
      name: "release",
      func: "registry.gitlab.com/js/release:1.0.0",
      inputs: { environment: "production", retries: 2 },
    },
    { name: "migrate", script: "npm run migrate", env: { DRY_RUN: "false" } },
  ],
  environment: "production",
});

describe("run", () => {
  it("emits the step list as data, in the docs' key order", () => {
    const parsed = parse(render(withJob(FUNCTION_JOB), { header: "" }));

    expect(parsed.build.run).toStrictEqual([
      {
        name: "validate",
        func: "registry.gitlab.com/js/validate:1.0.0",
        env: { BUILD_TARGET: "release" },
      },
      {
        name: "release",
        func: "registry.gitlab.com/js/release:1.0.0",
        inputs: { environment: "production", retries: 2 },
      },
      { name: "migrate", script: "npm run migrate", env: { DRY_RUN: "false" } },
    ]);
  });

  it("keeps the step's own key order: name, func or script, inputs, env", () => {
    const parsed = parse(render(withJob(FUNCTION_JOB), { header: "" }));

    expect(Object.keys(parsed.build.run[1])).toStrictEqual(["name", "func", "inputs"]);
    expect(Object.keys(parsed.build.run[2])).toStrictEqual(["name", "script", "env"]);
  });

  it("sits in the fixed order after script: stage, run, then the delivery keywords", () => {
    const parsed = parse(render(withJob(FUNCTION_JOB), { header: "" }));

    expect(Object.keys(parsed.build)).toStrictEqual(["stage", "run", "environment"]);
  });

  it("emits no key when the job does not declare a step list", () => {
    const parsed = parse(
      render(withJob(job({ name: "build", stage: "build", script: "npm ci" })), { header: "" }),
    );

    expect(Object.keys(parsed.build)).toStrictEqual(["stage", "script"]);
  });
});

describe("run diagnostics", () => {
  it("refuses a job that declares both run and script, naming both paths", () => {
    expect(
      pairsOf(
        withJob(job({ name: "build", script: "npm ci", run: [{ name: "run", func: "./run" }] })),
      ),
    ).toStrictEqual([
      {
        path: "$.jobs[0].run",
        message: 'job "build" declares both $.jobs[0].run and $.jobs[0].script; GitLab accepts one',
      },
    ]);
  });

  it("refuses run beside before_script or after_script, naming both paths", () => {
    const paired = withJob(
      job({
        name: "build",
        before_script: "echo before",
        after_script: "echo after",
        run: [{ name: "run", func: "./run" }],
      }),
    );

    expect(pairsOf(paired).map(({ message }) => message)).toStrictEqual([
      'job "build" declares both $.jobs[0].run and $.jobs[0].before_script; GitLab accepts one',
      'job "build" declares both $.jobs[0].run and $.jobs[0].after_script; GitLab accepts one',
    ]);
  });
});

describe("run step validation", () => {
  it("refuses an empty step list", () => {
    expect(pairsOf(withJob(job({ name: "build", run: [] })))).toStrictEqual([
      { path: "$.jobs[0].run", message: "run must contain at least one step" },
    ]);
  });

  it("refuses a step name GitLab does not accept", () => {
    expect(
      pairsOf(withJob(job({ name: "build", run: [{ name: "1st", func: "./run" }] }))),
    ).toStrictEqual([
      {
        path: "$.jobs[0].run[0]",
        message: 'step name "1st" must be alphanumeric or underscore, and not start with a number',
      },
    ]);
  });

  it("refuses run through job raw, which is reserved for the field", () => {
    const rawRun = { run: [{ name: "run", func: "./run" }] } as const;

    expect(
      pairsOf(withJob(job({ name: "build", script: "npm ci", raw: rawRun }))).map(
        ({ path }) => path,
      ),
    ).toStrictEqual(['$.jobs[0].raw["run"]']);
  });
});
