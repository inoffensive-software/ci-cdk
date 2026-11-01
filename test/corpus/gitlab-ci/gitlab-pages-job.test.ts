import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "@inoffensive/ci-cdk/gitlab-ci";
import { GITLAB_PAGES_JOB } from "./gitlab-pages-job.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: gitlab-pages-job (documentation-derived)", () => {
  it("reproduces the shape file's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "gitlab-pages-job.yml"));

    expect(parse(render(GITLAB_PAGES_JOB, { header: "" }))).toStrictEqual(upstream);
  });
});
