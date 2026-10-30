import { describe, expect, it } from "vitest";

import type { DocEntry } from "./doc.js";
import type { Diagnostic } from "./errors.js";
import { fromValue } from "./from-value.js";
import { rawKeyPath } from "./paths.js";
import { lowerRawBlock, rawEntries } from "./raw.js";

const MODELLED: readonly DocEntry[] = [{ key: "run", value: fromValue("npm test") }];

describe("rawEntries", () => {
  it("appends kept keys after the modelled ones in author order", () => {
    const diagnostics: Diagnostic[] = [];

    const entries = rawEntries(
      "$.jobs[0]",
      { "continue-on-error": true, if: "branch" },
      MODELLED,
      diagnostics,
    );

    expect(diagnostics).toStrictEqual([]);
    expect(entries.map((entry) => entry.key)).toStrictEqual(["continue-on-error", "if"]);
  });

  it("emits nothing when raw is absent", () => {
    const diagnostics: Diagnostic[] = [];

    expect(rawEntries("$.jobs[0]", undefined, MODELLED, diagnostics)).toStrictEqual([]);
    expect(diagnostics).toStrictEqual([]);
  });
});

describe("rawEntries collisions", () => {
  it("refuses a collision in dot notation by default", () => {
    const diagnostics: Diagnostic[] = [];

    expect(rawEntries("$.jobs[0]", { run: "x" }, MODELLED, diagnostics)).toStrictEqual([]);
    expect(diagnostics).toStrictEqual([
      {
        path: "$.jobs[0].raw.run",
        message: 'raw key "run" is already emitted at this level',
        hint: "use the modelled field, or remove the raw entry",
      },
    ]);
  });

  it("refuses a collision in the notation the caller passes", () => {
    const diagnostics: Diagnostic[] = [];

    rawEntries("$.jobs[0]", { run: "x" }, MODELLED, diagnostics, [], rawKeyPath);

    expect(diagnostics).toStrictEqual([
      {
        path: '$.jobs[0].raw["run"]',
        message: 'raw key "run" is already emitted at this level',
        hint: "use the modelled field, or remove the raw entry",
      },
    ]);
  });
});

describe("rawEntries refusals", () => {
  it("refuses a key the struct owns but never emits", () => {
    const diagnostics: Diagnostic[] = [];

    expect(rawEntries("$.jobs[0]", { id: "build" }, [], diagnostics, ["id"])).toStrictEqual([]);
    expect(diagnostics.map(({ path }) => path)).toStrictEqual(["$.jobs[0].raw.id"]);
  });

  it("reports a raw block that is not a keyed record", () => {
    const diagnostics: Diagnostic[] = [];

    const entries = rawEntries(
      "$.jobs[0]",
      // @ts-expect-error raw is a record of keys to values, not an array
      ["badge"],
      MODELLED,
      diagnostics,
    );

    expect(entries).toStrictEqual([]);
    expect(diagnostics).toStrictEqual([
      { path: "$.jobs[0].raw", message: "raw must be a plain record of keys to values" },
    ]);
  });
});

describe("lowerRawBlock", () => {
  it("re-bases a nested boundary diagnostic at the raw block", () => {
    const diagnostics: Diagnostic[] = [];

    const entries = lowerRawBlock(
      // @ts-expect-error a Set is not plain data
      { tags: new Set<string>() },
      "$.raw",
      diagnostics,
    );

    expect(entries).toStrictEqual([]);
    expect(diagnostics).toStrictEqual([
      {
        path: "$.raw.tags",
        message: "a Set is not plain data",
        hint: "use only plain objects, arrays, strings, finite numbers, booleans and null",
      },
    ]);
  });
});
