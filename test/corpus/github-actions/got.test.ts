import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/github-actions/index.js";
import { GOT } from "./got.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: sindresorhus/got", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "got.yml"));

    expect(parse(render(GOT, { header: "" }))).toStrictEqual(upstream);
  });
});
