import { describe, expect, it } from "vitest";

import type { Doc, DocEntry } from "../core/index.js";
import { pipelineConfig, step, toDoc } from "./index.js";

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
  pipelineConfig({
    image: "node:18-bullseye",
    pipelines: {
      default: [step({ script: ["true"], raw: { after: "raw" } })],
    },
    raw: { options: { docker: true } },
  }),
);

const firstItem = (doc: Doc): Doc => {
  const items = entry(entry(doc, "pipelines"), "default");

  if (items.kind !== "seq") {
    throw new Error("expected a sequence");
  }

  const first = items.items[0];

  if (first === undefined) {
    throw new Error("expected an item");
  }

  return first;
};

describe("toDoc", () => {
  it("emits a step item as a map with exactly one key", () => {
    expect(keys(firstItem(DOC))).toStrictEqual(["step"]);
  });

  it("puts modelled keys before raw keys at document and step level", () => {
    expect(keys(DOC)).toStrictEqual(["image", "pipelines", "options"]);
    expect(keys(entry(firstItem(DOC), "step"))).toStrictEqual(["script", "after"]);
  });

  it("lowers branches to a map keyed by pattern in array order", () => {
    const doc = toDoc(
      pipelineConfig({
        pipelines: {
          branches: [
            { pattern: "main", pipeline: [step({ script: ["one"] })] },
            { pattern: "*", pipeline: [step({ script: ["two"] })] },
          ],
        },
      }),
    );

    expect(keys(entry(entry(doc, "pipelines"), "branches"))).toStrictEqual(["main", "*"]);
  });
});
