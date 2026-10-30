import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/github-actions/index.js";
import { ANYHOW } from "./anyhow.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: dtolnay/anyhow", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "anyhow.yml"));

    expect(parse(render(ANYHOW, { header: "" }))).toStrictEqual(upstream);
  });
});
