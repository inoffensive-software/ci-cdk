import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "@inoffensive/ci-cdk/gitlab-ci";
import { GITLAB_RUN } from "./gitlab-run.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: gitlab-run (documentation-derived)", () => {
  it("reproduces the fixture's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "gitlab-run.yml"));

    expect(parse(render(GITLAB_RUN, { header: "" }))).toStrictEqual(upstream);
  });
});
