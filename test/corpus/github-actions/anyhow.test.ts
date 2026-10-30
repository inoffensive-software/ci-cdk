import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/github-actions/index.js";
import { anyhow } from "./anyhow.fixture.js";
import { vendored } from "./vendored.js";

describe("corpus: dtolnay/anyhow", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await vendored("anyhow.yml"));

    expect(parse(render(anyhow, { header: "" }))).toStrictEqual(upstream);
  });
});
