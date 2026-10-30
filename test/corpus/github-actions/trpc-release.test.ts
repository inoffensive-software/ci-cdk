import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/github-actions/index.js";
import { TRPC_RELEASE } from "./trpc-release.fixture.js";
import { vendored } from "./vendored.js";

describe("corpus: trpc/trpc release", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await vendored("trpc-release.yml"));

    expect(parse(render(TRPC_RELEASE, { header: "" }))).toStrictEqual(upstream);
  });
});
