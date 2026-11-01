import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "@inoffensive/ci-cdk/gitlab-ci";
import { GITLAB_TOKENS } from "./gitlab-tokens.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: gitlab-tokens (documentation-derived)", () => {
  it("reproduces the pinned fixture's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "gitlab-tokens.yml"));

    expect(parse(render(GITLAB_TOKENS, { header: "" }))).toStrictEqual(upstream);
  });
});
