import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/github-actions/index.js";
import { trpcMain } from "./trpc-main.fixture.js";
import { vendored } from "./vendored.js";

describe("corpus: trpc/trpc main", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await vendored("trpc-main.yml"));

    expect(parse(render(trpcMain, { header: "" }))).toStrictEqual(upstream);
  });
});
