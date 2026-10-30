import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { render } from "../../../src/github-actions/index.js";
import { got } from "./fixtures.js";

const vendored = (name: string): Promise<string> =>
  readFile(join(import.meta.dirname, name), "utf8");

describe("corpus: sindresorhus/got", () => {
  it("reproduces the pinned config byte for byte, header suppressed", async () => {
    const upstream = await vendored("got.yml");

    expect(render(got, { header: "" })).toBe(upstream);
  });
});
