import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "@inoffensive/ci-cdk/gitlab-ci";
import { TERRAFORM_IMAGES } from "./terraform-images.fixture.js";
import { readVendored } from "../vendored.js";

describe("corpus: gitlab-org/terraform-images", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "terraform-images.yml"));

    expect(parse(render(TERRAFORM_IMAGES, { header: "" }))).toStrictEqual(upstream);
  });
});
