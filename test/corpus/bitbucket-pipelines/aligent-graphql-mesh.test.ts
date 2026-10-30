import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/bitbucket-pipelines/index.js";
import { readVendored } from "../vendored.js";
import { ALIGENT_GRAPHQL_MESH } from "./aligent-graphql-mesh.fixture.js";

describe("corpus: aligent/aligent-graphql-mesh", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "aligent-graphql-mesh.yml"));

    expect(parse(render(ALIGENT_GRAPHQL_MESH, { header: "" }))).toStrictEqual(upstream);
  });
});
