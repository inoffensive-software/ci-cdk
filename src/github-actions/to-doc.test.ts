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

const smallest = toDoc(
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
  it("emits the workflow entries in declared order", () => {
    expect(keys(smallest)).toStrictEqual(["name", "on", "jobs"]);
  });

  it("keys the jobs map by id and strips id from the job body", () => {
    const jobs = entry(smallest, "jobs");

    expect(keys(jobs)).toStrictEqual(["build"]);

    const body = entry(jobs, "build");

    expect(keys(body)).toStrictEqual(["runs-on", "steps"]);
    expect(keys(body)).not.toContain("id");
  });

  it("lowers a run string to a literal block scalar", () => {
    const firstStep = first(entry(entry(entry(smallest, "jobs"), "build"), "steps"));

    expect(entry(firstStep, "run")).toStrictEqual({
      kind: "scalar",
      value: "npm test",
      style: "literal",
    });
  });
});
