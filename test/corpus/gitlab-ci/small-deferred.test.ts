import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "@inoffensive/ci-cdk/gitlab-ci";
import { SMALL_DEFERRED } from "./small-deferred.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: small-deferred (documentation-derived)", () => {
  it("reproduces the fixture's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "small-deferred.yml"));

    expect(parse(render(SMALL_DEFERRED, { header: "" }))).toStrictEqual(upstream);
  });
});
