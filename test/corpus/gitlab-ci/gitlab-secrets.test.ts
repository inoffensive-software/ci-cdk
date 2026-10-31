import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "@inoffensive/ci-cdk/gitlab-ci";
import { GITLAB_SECRETS } from "./gitlab-secrets.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: gitlab-secrets (documentation-derived)", () => {
  it("reproduces the pinned fixture's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "gitlab-secrets.yml"));

    expect(parse(render(GITLAB_SECRETS, { header: "" }))).toStrictEqual(upstream);
  });
});
