import { describe, expect, it } from "vitest";

import type { Doc, DocEntry } from "../core/index.js";
import * as provider from "./index.js";
import { job, pipeline, toDoc } from "./index.js";

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

const DOC = toDoc(
  pipeline({
    stages: ["build", "test"],
    jobs: [
      job({ name: "zulu", stage: "build", script: ["npm ci"] }),
      job({ name: "alpha", script: "npm test" }),
    ],
  }),
);

describe("toDoc", () => {
  it("keys the document by stages and then job name in array order", () => {
    expect(keys(DOC)).toStrictEqual(["stages", "zulu", "alpha"]);
  });

  it("keys the jobs map by name and strips the identity field from the body", () => {
    expect(keys(entry(DOC, "zulu"))).toStrictEqual(["stage", "script"]);
    expect(keys(entry(DOC, "alpha"))).toStrictEqual(["script"]);
    expect(keys(entry(DOC, "zulu"))).not.toContain("name");
  });
});

describe("barrel", () => {
  it("exposes exactly the two functions and two builders", () => {
    expect(Object.keys(provider).toSorted()).toStrictEqual(["job", "pipeline", "render", "toDoc"]);
  });
});
