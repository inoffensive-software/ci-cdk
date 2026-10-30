import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/github-actions/index.js";
import { TRPC_MAIN } from "./trpc-main.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: trpc/trpc main", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "trpc-main.yml"));

    expect(parse(render(TRPC_MAIN, { header: "" }))).toStrictEqual(upstream);
  });
});
