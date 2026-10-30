import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "@inoffensive/ci-cdk/gitlab-ci";
import { GITLAB_PAGES } from "./gitlab-pages.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: gitlab-org/gitlab-pages", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "gitlab-pages.yml"));

    expect(parse(render(GITLAB_PAGES, { header: "" }))).toStrictEqual(upstream);
  });
});
