import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/bitbucket-pipelines/index.js";
import { readVendored } from "../vendored.js";
import { RAIR_DAPP } from "./rair-dapp.fixture.js";

describe("corpus: rairprotocol/rair-dapp", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "rair-dapp.yml"));

    expect(parse(render(RAIR_DAPP, { header: "" }))).toStrictEqual(upstream);
  });
});
