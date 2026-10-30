import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/bitbucket-pipelines/index.js";
import { readVendored } from "../vendored.js";
import { OBUSPA } from "./obuspa.fixture.js";

describe("corpus: BroadbandForum/obuspa", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "obuspa.yml"));

    expect(parse(render(OBUSPA, { header: "" }))).toStrictEqual(upstream);
  });
});
