import { describe, expect, it } from "vitest";

import * as entry from "./index.js";

describe("test harness", () => {
  it("resolves the package entry point", () => {
    expect(entry).toBeTypeOf("object");
  });

  it("writes golden files next to the test", async () => {
    await expect("golden file harness\n").toMatchFileSnapshot("__snapshots__/harness.txt");
  });
});
