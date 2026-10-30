import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import {
  type Job,
  type Step,
  type Workflow,
  expr,
  job,
  render,
  step,
  toDoc,
  workflow,
} from "./index.js";

const withStep = (value: Step): Workflow =>
  workflow({
    name: "CI",
    on: "push",
    jobs: [job({ id: "build", "runs-on": "ubuntu-latest", steps: [value] })],
  });

const withJob = (value: Omit<Job, "id">): Workflow =>
  workflow({ name: "CI", on: "push", jobs: [job({ id: "build", ...value })] });

const textOf = (value: Workflow): string => render(value, { header: "" });

const diagnosticsOf = (value: Workflow): readonly Diagnostic[] => {
  try {
    toDoc(value);
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics;
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

const pairsOf = (value: Workflow): readonly { path: string; message: string }[] =>
  diagnosticsOf(value).map(({ path, message }) => ({ path, message }));

describe("scalar with values", () => {
  it("emits a number as a number, and it parses back as one", () => {
    const value = withStep(step({ uses: "actions/checkout@v7", with: { "fetch-depth": 0 } }));

    expect(textOf(value)).toContain("fetch-depth: 0\n");
    expect(textOf(value)).not.toContain('"0"');
    expect(parse(textOf(value))).toMatchObject({
      jobs: { build: { steps: [{ with: { "fetch-depth": 0 } }] } },
    });
  });

  it("emits a boolean as a boolean", () => {
    const value = withStep(
      step({ uses: "actions/checkout@v7", with: { "persist-credentials": false } }),
    );

    expect(textOf(value)).toContain("persist-credentials: false\n");
    expect(parse(textOf(value))).toMatchObject({
      jobs: { build: { steps: [{ with: { "persist-credentials": false } }] } },
    });
  });

  it("lets a leaf keep its own style", () => {
    const value = withStep(step({ uses: "owner/action@v1", with: { ref: expr`inputs.ref` } }));

    expect(textOf(value)).toContain('ref: "${{ inputs.ref }}"\n');
  });
});

describe("scalar env values", () => {
  it("accepts a boolean at workflow, job, step and container level", () => {
    const value = workflow({
      name: "CI",
      on: "push",
      env: { CI: true },
      jobs: [
        job({
          id: "build",
          "runs-on": "ubuntu-latest",
          env: { RETRIES: 3 },
          container: { image: "node:24", env: { CI: false } },
          steps: [step({ run: "npm test", env: { VERBOSE: false } })],
        }),
      ],
    });

    const text = textOf(value);

    expect(parse(textOf(value))).toMatchObject({
      env: { CI: true },
      jobs: {
        build: {
          env: { RETRIES: 3 },
          container: { env: { CI: false } },
          steps: [{ env: { VERBOSE: false } }],
        },
      },
    });
    expect(text).toContain("CI: true\n");
    expect(text).toContain("RETRIES: 3\n");
  });

  it("accepts a number in a job's with map", () => {
    const value = withJob({
      uses: "owner/repo/.github/workflows/build.yml@main",
      with: { depth: 5 },
    });

    expect(parse(textOf(value))).toMatchObject({
      jobs: { build: { with: { depth: 5 } } },
    });
  });
});

describe("scalar boundary", () => {
  it("rejects a Date in a with map, at the entry's path", () => {
    const value = withStep(
      step({
        uses: "owner/action@v1",
        with: {
          // @ts-expect-error a Date is not a scalar
          when: new Date(0),
        },
      }),
    );

    expect(pairsOf(value)).toStrictEqual([{ path: "$.when", message: "a Date is not plain data" }]);
  });

  it("rejects a function in a container env, at the entry's path", () => {
    const value = withJob({
      "runs-on": "ubuntu-latest",
      container: {
        image: "node:24",
        env: {
          // @ts-expect-error a function is not a scalar
          callback: () => "x",
        },
      },
      steps: [step({ run: "npm test" })],
    });

    expect(pairsOf(value)).toStrictEqual([
      { path: "$.callback", message: "functions cannot be emitted" },
    ]);
  });
});
