import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { Value } from "./index.js";

type CoreModule = typeof import("./index.js");

const coreDir = import.meta.dirname;

const loadFresh = (): Promise<CoreModule> => {
  // Clearing the registry re-instantiates every core module. A query suffix would only re-run the
  // barrel, leaving doc/render-doc/serialize shared between the two graphs.
  vi.resetModules();

  return import("./index.js");
};

const fixture: Value = {
  name: "ci",
  on: ["push", "pull_request"],
  env: { "1.10": "1.10", yes: "yes", n: null, f: 1.5 },
  steps: [{ run: "npm test" }, { uses: "actions/checkout@v4" }],
};

const emitWith = (module: CoreModule): string =>
  module.renderDoc(module.fromValue(fixture), { header: "" });

const providerNames = /\b(?:github|gitlab|bitbucket|actions)\b/iu;

const sourceFiles = async (directory: string): Promise<readonly string[]> => {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });

  const paths = entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"));

  return paths.toSorted((left, right) => left.localeCompare(right));
};

describe("determinism", () => {
  it("renders the same bytes from two fresh module graphs", async () => {
    const first = await loadFresh();
    const second = await loadFresh();

    // Without this, a shared emitter would make the byte comparison pass by construction.
    expect(second.renderDoc).not.toBe(first.renderDoc);
    expect(second.fromValue).not.toBe(first.fromValue);
    expect(emitWith(first)).toBe(emitWith(second));
  });

  it("ends with exactly one newline and no carriage returns", async () => {
    const module = await loadFresh();
    const text = emitWith(module);

    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
    expect(text.length - text.trimEnd().length).toBe(1);
    expect(text.includes("\r")).toBe(false);
  });
});

const filesMentioningProvider = async (directory: string): Promise<readonly string[]> => {
  const files = await sourceFiles(directory);
  const contents = await Promise.all(files.map((file) => readFile(file, "utf8")));

  return files.filter((_file, index) => providerNames.test(contents[index] ?? ""));
};

describe("provider blindness", () => {
  it("finds no provider name under src/core", async () => {
    expect(await filesMentioningProvider(coreDir)).toStrictEqual([]);
  });

  it("scans the core sources", async () => {
    expect(await sourceFiles(coreDir)).not.toHaveLength(0);
  });
});
