import { describe, expect, it } from "vitest";

import type { Doc, DocEntry } from "../core/index.js";
import { job, step, toDoc, workflow } from "./index.js";

const entries = (doc: Doc): readonly DocEntry[] => {
  if (doc.kind !== "map") {
    throw new Error("expected a map");
  }

  return doc.entries;
};

const keys = (doc: Doc): readonly string[] => entries(doc).map((entry) => entry.key);

const entry = (doc: Doc, key: string): Doc => {
  const found = entries(doc).find((candidate) => candidate.key === key);

  if (found === undefined) {
    throw new Error(`no entry ${key}`);
  }

  return found.value;
};

const items = (doc: Doc): readonly Doc[] => {
  if (doc.kind !== "seq") {
    throw new Error("expected a sequence");
  }

  return doc.items;
};

const first = (doc: Doc): Doc => {
  const [item] = items(doc);

  if (item === undefined) {
    throw new Error("expected a sequence item");
  }

  return item;
};

const SMALLEST = toDoc(
  workflow({
    name: "CI",
    on: "push",
    jobs: [
      job({
        id: "build",
        "runs-on": "ubuntu-latest",
        steps: [step({ run: "npm test" })],
      }),
    ],
  }),
);

describe("toDoc", () => {
  it("emits run-name directly after name and leaves the rest in declared order", () => {
    const doc = toDoc(
      workflow({
        name: "CI",
        "run-name": "CI ${{ inputs.ref }}",
        on: "push",
        permissions: "read-all",
        jobs: [job({ id: "build", "runs-on": "ubuntu-latest", steps: [step({ run: "true" })] })],
      }),
    );

    expect(keys(doc)).toStrictEqual(["name", "run-name", "on", "permissions", "jobs"]);
    expect(entry(doc, "run-name")).toStrictEqual({
      kind: "scalar",
      value: "CI ${{ inputs.ref }}",
      style: "plain",
    });
  });
});

describe("toDoc matrix rows", () => {
  it("lowers an object matrix row through the boundary parser in author key order", () => {
    const doc = toDoc(
      workflow({
        name: "CI",
        on: "push",
        jobs: [
          job({
            id: "build",
            "runs-on": "ubuntu-latest",
            strategy: {
              matrix: {
                settings: [
                  { host: "macos-latest", target: "aarch64-apple-darwin" },
                  { prepare: "make deps", host: "ubuntu-latest", target: "x86_64-unknown-linux" },
                ],
              },
            },
            steps: [step({ run: "true" })],
          }),
        ],
      }),
    );

    const settings = entry(entry(entry(entry(doc, "jobs"), "build"), "strategy"), "matrix");
    const rows = entry(settings, "settings");

    expect(items(rows).map((row) => keys(row))).toStrictEqual([
      ["host", "target"],
      ["prepare", "host", "target"],
    ]);
  });
});

describe("toDoc ordering", () => {
  it("emits the workflow entries in declared order", () => {
    expect(keys(SMALLEST)).toStrictEqual(["name", "on", "jobs"]);
  });

  it("keys the jobs map by id and strips id from the job body", () => {
    const jobs = entry(SMALLEST, "jobs");

    expect(keys(jobs)).toStrictEqual(["build"]);

    const body = entry(jobs, "build");

    expect(keys(body)).toStrictEqual(["runs-on", "steps"]);
    expect(keys(body)).not.toContain("id");
  });

  it("lowers a run string to a literal block scalar", () => {
    const firstStep = first(entry(entry(entry(SMALLEST, "jobs"), "build"), "steps"));

    expect(entry(firstStep, "run")).toStrictEqual({
      kind: "scalar",
      value: "npm test",
      style: "literal",
    });
  });
});

describe("toDoc cache-mode", () => {
  it("emits cache-mode directly after permissions at both levels", () => {
    const doc = toDoc(
      workflow({
        name: "CI",
        on: "push",
        permissions: "read-all",
        "cache-mode": "none",
        jobs: [
          job({
            id: "build",
            permissions: { contents: "read" },
            "cache-mode": "write-only",
            "runs-on": "ubuntu-latest",
            steps: [step({ run: "true" })],
          }),
        ],
      }),
    );

    expect(keys(doc)).toStrictEqual(["name", "on", "permissions", "cache-mode", "jobs"]);
    expect(keys(entry(entry(doc, "jobs"), "build"))).toStrictEqual([
      "permissions",
      "cache-mode",
      "runs-on",
      "steps",
    ]);
  });
});

describe("toDoc environment", () => {
  it("emits deployment directly after url on an environment target", () => {
    const doc = toDoc(
      workflow({
        name: "CI",
        on: "push",
        jobs: [
          job({
            id: "deploy",
            "runs-on": "ubuntu-latest",
            environment: { name: "production", url: "https://example.com", deployment: false },
            steps: [step({ run: "true" })],
          }),
        ],
      }),
    );

    const environment = entry(entry(entry(doc, "jobs"), "deploy"), "environment");

    expect(keys(environment)).toStrictEqual(["name", "url", "deployment"]);
    expect(entry(environment, "deployment")).toStrictEqual({
      kind: "scalar",
      value: "false",
      style: "plain",
      tag: "!!bool",
    });
  });
});
