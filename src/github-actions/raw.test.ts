import { describe, expect, it } from "vitest";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { type Workflow, job, render, step, toDoc, workflow } from "./index.js";

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

/** Diagnostics are asserted as paths and messages, so a wording change cannot slip past a path. */
const pairsOf = (run: () => void): readonly { path: string; message: string }[] =>
  diagnosticsOf(run).map(({ path, message }) => ({ path, message }));

const buildJob = (): ReturnType<typeof job> =>
  job({
    id: "build",
    "runs-on": "ubuntu-latest",
    steps: [step({ run: "npm test" })],
  });

describe("workflow raw", () => {
  it("emits raw entries after the modelled keys", () => {
    const text = render(
      workflow({
        name: "CI",
        on: "push",
        jobs: [buildJob()],
        raw: { "run-name": "deploy ${{ github.ref }}" },
      }),
      { header: "" },
    );

    expect(text).toBe(
      "name: CI\n" +
        "on: push\n" +
        "jobs:\n" +
        "  build:\n" +
        "    runs-on: ubuntu-latest\n" +
        "    steps:\n" +
        "      - run: |-\n" +
        "          npm test\n" +
        "run-name: deploy ${{ github.ref }}\n",
    );
  });
});

const nestedRaw = (): Workflow =>
  workflow({
    name: "CI",
    on: "push",
    jobs: [
      job({
        id: "build",
        "runs-on": "ubuntu-latest",
        raw: { concurrency: { group: "ci-${{ github.ref }}", "cancel-in-progress": true } },
        steps: [step({ run: "npm test", raw: { "custom-key": "custom value" } })],
      }),
    ],
  });

describe("job and step raw", () => {
  it("pins raw entries inside their own body, after the modelled keys", async () => {
    await expect(render(nestedRaw())).toMatchFileSnapshot("__snapshots__/raw-shape.yml");
  });
});

/** Every value the core boundary parser refuses, written where a raw block would put them. */
const unlowerableRaw = (): Workflow =>
  workflow({
    name: "CI",
    on: "push",
    jobs: [
      job({
        id: "build",
        "runs-on": "ubuntu-latest",
        steps: [],
        raw: {
          // @ts-expect-error a function cannot cross the boundary
          callback: () => "x",
          // @ts-expect-error a symbol has no text form
          marker: Symbol("ci"),
          // @ts-expect-error a bigint has no text form
          bytes: 10n,
          ratio: Number.NaN,
          // @ts-expect-error a Date is not plain data
          when: new Date(0),
          // @ts-expect-error a Map is not plain data
          index: new Map<string, string>(),
          // @ts-expect-error a Set is not plain data
          tags: new Set<string>(),
          // @ts-expect-error undefined is not a value
          missing: undefined,
        },
      }),
    ],
  });

/** Raw keys that a modelled field already emitted at their own level, plus the job identity. */
const collidingRaw = (): Workflow =>
  workflow({
    name: "CI",
    on: "push",
    jobs: [
      job({
        id: "build",
        "runs-on": "ubuntu-latest",
        raw: { "runs-on": "windows-latest", id: "shadow" },
        steps: [step({ run: "npm test", raw: { run: "echo no" } })],
      }),
    ],
  });

/** A raw problem at each of the three levels, to prove one call collects them all. */
const problemAtEveryLevel = (): Workflow =>
  workflow({
    name: "CI",
    on: "push",
    jobs: [
      job({
        id: "build",
        "runs-on": "ubuntu-latest",
        // @ts-expect-error a Date is not plain data
        raw: { when: new Date(0) },
        // @ts-expect-error a function cannot cross the boundary
        steps: [step({ run: "npm test", raw: { callback: () => "x" } })],
      }),
    ],
    // @ts-expect-error a symbol has no text form
    raw: { badge: Symbol("ci") },
  });

/** A raw block that is neither a plain record nor even keyed, reachable only through a cast. */
const notARecord = (): Workflow =>
  workflow({
    name: "CI",
    on: "push",
    jobs: [buildJob()],
    // @ts-expect-error raw is a record of keys to values, not a Map
    raw: new Map([["badge", "ci"]]),
  });

/** The list-shaped counterpart: it lowers to a sequence, which is not a keyed record. */
const notAKeyedRecord = (): Workflow =>
  workflow({
    name: "CI",
    on: "push",
    jobs: [buildJob()],
    // @ts-expect-error raw is a record of keys to values, not an array
    raw: ["badge"],
  });

describe("raw diagnostics", () => {
  it("rejects every value the boundary refuses, at the raw entry's path", () => {
    expect(pairsOf(() => toDoc(unlowerableRaw()))).toStrictEqual([
      { path: "$.jobs[0].raw.callback", message: "functions cannot be emitted" },
      { path: "$.jobs[0].raw.marker", message: "symbols cannot be emitted" },
      { path: "$.jobs[0].raw.bytes", message: "bigint is not supported" },
      { path: "$.jobs[0].raw.ratio", message: "NaN is not a finite number" },
      { path: "$.jobs[0].raw.when", message: "a Date is not plain data" },
      { path: "$.jobs[0].raw.index", message: "a Map is not plain data" },
      { path: "$.jobs[0].raw.tags", message: "a Set is not plain data" },
      { path: "$.jobs[0].raw.missing", message: "undefined is not a value" },
    ]);
  });

  it("rejects a raw key that a modelled field already emitted", () => {
    expect(pairsOf(() => render(collidingRaw())).map(({ path }) => path)).toStrictEqual([
      "$.jobs[0].steps[0].raw.run",
      '$.jobs[0].raw["runs-on"]',
      "$.jobs[0].raw.id",
    ]);
  });

  it("rejects a raw block that is not a plain record", () => {
    expect(pairsOf(() => toDoc(notARecord()))).toStrictEqual([
      { path: "$.raw", message: "a Map is not plain data" },
    ]);
    expect(pairsOf(() => toDoc(notAKeyedRecord()))).toStrictEqual([
      { path: "$.raw", message: "raw must be a plain record of keys to values" },
    ]);
  });

  it("reports every raw problem in one call, at every level", () => {
    expect(pairsOf(() => toDoc(problemAtEveryLevel())).map(({ path }) => path)).toStrictEqual([
      "$.jobs[0].steps[0].raw.callback",
      "$.jobs[0].raw.when",
      "$.raw.badge",
    ]);
  });
});
