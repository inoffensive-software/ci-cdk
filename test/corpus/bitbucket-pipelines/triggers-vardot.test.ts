import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/bitbucket-pipelines/index.js";
import { readVendored } from "../vendored.js";
import { TRIGGERS_VARDOT } from "./triggers-vardot.fixture.js";

describe("corpus: Vardot/ddev-dev-tools", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "triggers-vardot.yml"));

    expect(parse(render(TRIGGERS_VARDOT, { header: "" }))).toStrictEqual(upstream);
  });
});
