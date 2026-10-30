import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "@inoffensive/ci-cdk/gitlab-ci";
import { LABKIT } from "./labkit.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: gitlab-org/labkit", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "labkit.yml"));

    expect(parse(render(LABKIT, { header: "" }))).toStrictEqual(upstream);
  });
});
