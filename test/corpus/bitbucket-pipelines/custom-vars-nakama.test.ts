import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/bitbucket-pipelines/index.js";
import { readVendored } from "../vendored.js";
import { CUSTOM_VARS_NAKAMA } from "./custom-vars-nakama.fixture.js";

describe("corpus: Nakama-Partnering-Services/nakama-project-scaffolding", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "custom-vars-nakama.yml"));

    expect(parse(render(CUSTOM_VARS_NAKAMA, { header: "" }))).toStrictEqual(upstream);
  });
});
