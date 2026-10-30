import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/github-actions/index.js";
import { TURBO_LSP } from "./turbo-lsp.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: vercel/turborepo lsp", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "turbo-lsp.yml"));

    expect(parse(render(TURBO_LSP, { header: "" }))).toStrictEqual(upstream);
  });
});
