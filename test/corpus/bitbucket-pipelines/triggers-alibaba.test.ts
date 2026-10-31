import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/bitbucket-pipelines/index.js";
import { readVendored } from "../vendored.js";
import { TRIGGERS_ALIBABA } from "./triggers-alibaba.fixture.js";

describe("corpus: alibaba/open-code-review", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "triggers-alibaba.yml"));

    expect(parse(render(TRIGGERS_ALIBABA, { header: "" }))).toStrictEqual(upstream);
  });
});
