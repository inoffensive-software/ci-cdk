import { describe, expect, it } from "vitest";

import { render } from "../../../src/github-actions/index.js";
import { got } from "./fixtures.js";
import { vendored } from "./vendored.js";

describe("corpus: sindresorhus/got", () => {
  it("reproduces the pinned config byte for byte, header suppressed", async () => {
    const upstream = await vendored("got.yml");

    expect(render(got, { header: "" })).toBe(upstream);
  });
});
