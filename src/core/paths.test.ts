import { describe, expect, it } from "vitest";

import { keyPath, rawKeyPath, rebase } from "./paths.js";

describe("keyPath", () => {
  it("uses dot notation for an identifier-like key", () => {
    expect(keyPath("$.jobs[0]", "raw")).toBe("$.jobs[0].raw");
    expect(keyPath("$", "$schema")).toBe("$.$schema");
  });

  it("quotes a key that is not an identifier", () => {
    expect(keyPath("$.jobs[0].raw", "runs-on")).toBe('$.jobs[0].raw["runs-on"]');
    expect(keyPath("$", "1st")).toBe('$["1st"]');
  });
});

describe("rawKeyPath", () => {
  it("quotes every key, because a raw key is author data", () => {
    expect(rawKeyPath("$.raw", "run")).toBe('$.raw["run"]');
    expect(rawKeyPath("$.jobs[0].raw", "runs-on")).toBe('$.jobs[0].raw["runs-on"]');
  });
});

describe("rebase", () => {
  it("re-roots a nested diagnostic at the raw block", () => {
    expect(
      rebase("$.jobs[0].raw", { path: "$.tags[0]", message: "a Set is not plain data" }),
    ).toStrictEqual({
      path: "$.jobs[0].raw.tags[0]",
      message: "a Set is not plain data",
    });
  });

  it("keeps the hint when the diagnostic carries one", () => {
    const rebased = rebase("$.raw", {
      path: "$.run",
      message: "functions cannot be emitted",
      hint: "pass a string instead",
    });

    expect(rebased).toStrictEqual({
      path: "$.raw.run",
      message: "functions cannot be emitted",
      hint: "pass a string instead",
    });
  });
});
