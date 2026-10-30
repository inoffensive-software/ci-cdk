import { describe, expect, it } from "vitest";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { type Job, type Workflow, job, render, step, workflow } from "./index.js";

const jobOf = (id: string, overrides: Partial<Job> = {}): Job =>
  job({ id, "runs-on": "ubuntu-latest", steps: [step({ run: "npm test" })], ...overrides });

const ci = (jobs: readonly Job[]): Workflow => workflow({ name: "CI", on: "push", jobs });

const diagnosticsOf = (value: Workflow): readonly Diagnostic[] => {
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

describe("duplicate job ids", () => {
  it("reports both positions instead of dropping one", () => {
    const diagnostics = diagnosticsOf(ci([jobOf("build"), jobOf("build")]));
    const message = 'duplicate job id "build": $.jobs[0].id and $.jobs[1].id';

    expect(diagnostics).toStrictEqual([
      { path: "$.jobs[0].id", message },
      { path: "$.jobs[1].id", message },
    ]);
  });
});

describe("dangling needs", () => {
  it("reports a scalar need that does not exist", () => {
    const diagnostics = diagnosticsOf(ci([jobOf("build"), jobOf("test", { needs: "missing" })]));

    expect(diagnostics).toStrictEqual([
      {
        path: "$.jobs[1].needs",
        message: 'job "test" needs "missing", which does not exist',
      },
    ]);
  });

  it("reports the array entry that does not exist", () => {
    const diagnostics = diagnosticsOf(
      ci([
        jobOf("build"),
        jobOf("test", { needs: "build" }),
        jobOf("deploy", { needs: ["build", "missing"] }),
      ]),
    );

    expect(diagnostics).toStrictEqual([
      {
        path: "$.jobs[2].needs[1]",
        message: 'job "deploy" needs "missing", which does not exist',
      },
    ]);
  });
});

describe("needs cycles", () => {
  it("lists the members in order", () => {
    const diagnostics = diagnosticsOf(
      ci([jobOf("build", { needs: "test" }), jobOf("test", { needs: "build" })]),
    );

    expect(diagnostics).toStrictEqual([
      { path: "$.jobs[1].needs", message: "needs cycle: build -> test -> build" },
    ]);
  });

  it("points at the edge that closes the cycle", () => {
    const diagnostics = diagnosticsOf(
      ci([jobOf("build", { needs: "test" }), jobOf("test", { needs: ["build", "build"] })]),
    );

    expect(diagnostics).toStrictEqual([
      { path: "$.jobs[1].needs[0]", message: "needs cycle: build -> test -> build" },
    ]);
  });

  it("reports a self-loop once", () => {
    const diagnostics = diagnosticsOf(ci([jobOf("build", { needs: "build" })]));

    expect(diagnostics).toStrictEqual([
      { path: "$.jobs[0].needs", message: "needs cycle: build -> build" },
    ]);
  });

  it("does not report a diamond as a cycle", () => {
    const value = ci([
      jobOf("build"),
      jobOf("test", { needs: "build" }),
      jobOf("lint", { needs: "build" }),
      jobOf("deploy", { needs: ["test", "lint"] }),
    ]);

    expect(() => render(value)).not.toThrow();
  });
});

describe("mutually exclusive bodies", () => {
  it("rejects a job with both steps and uses", () => {
    const diagnostics = diagnosticsOf(
      ci([jobOf("build", { uses: "owner/repo/.github/workflows/build.yml@main" })]),
    );

    expect(diagnostics).toStrictEqual([
      { path: "$.jobs[0]", message: 'job "build" has both "steps" and "uses"' },
    ]);
  });

  it("rejects a step with both run and uses at its own index", () => {
    const diagnostics = diagnosticsOf(
      ci([
        jobOf("build", {
          steps: [
            step({ run: "one" }),
            step({ run: "two" }),
            step({ run: "three" }),
            step({ uses: "actions/checkout@v4", run: "four" }),
          ],
        }),
      ]),
    );

    expect(diagnostics).toStrictEqual([
      { path: "$.jobs[0].steps[3]", message: 'a step has both "run" and "uses"' },
    ]);
  });
});

describe("one throw for every problem", () => {
  it("collects duplicate ids, a dangling need and both body conflicts", () => {
    const diagnostics = diagnosticsOf(
      ci([
        jobOf("build"),
        jobOf("build"),
        jobOf("deploy", { needs: ["build", "missing"] }),
        jobOf("reuse", { uses: "owner/repo/.github/workflows/reuse.yml@main" }),
        jobOf("check", {
          steps: [step({ run: "one" }), step({ uses: "actions/checkout@v4", run: "two" })],
        }),
      ]),
    );

    expect(diagnostics).toStrictEqual([
      {
        path: "$.jobs[0].id",
        message: 'duplicate job id "build": $.jobs[0].id and $.jobs[1].id',
      },
      {
        path: "$.jobs[1].id",
        message: 'duplicate job id "build": $.jobs[0].id and $.jobs[1].id',
      },
      {
        path: "$.jobs[2].needs[1]",
        message: 'job "deploy" needs "missing", which does not exist',
      },
      { path: "$.jobs[3]", message: 'job "reuse" has both "steps" and "uses"' },
      { path: "$.jobs[4].steps[1]", message: 'a step has both "run" and "uses"' },
    ]);
  });
});

describe("builders", () => {
  it("never validate or throw", () => {
    expect(() =>
      job({
        id: "reuse",
        steps: [step({ run: "one" })],
        uses: "owner/repo/.github/workflows/reuse.yml@main",
      }),
    ).not.toThrow();
    expect(() => step({ run: "one", uses: "actions/checkout@v4" })).not.toThrow();
  });
});
