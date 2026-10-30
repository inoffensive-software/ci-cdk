import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/github-actions/index.js";
import { readVendored } from "../vendored.js";
import { TRPC_RELEASE } from "./trpc-release.fixture.js";

describe("corpus: trpc/trpc release", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "trpc-release.yml"));

    expect(parse(render(TRPC_RELEASE, { header: "" }))).toStrictEqual(upstream);
  });
});
