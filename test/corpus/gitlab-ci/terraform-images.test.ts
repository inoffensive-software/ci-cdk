import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/gitlab-ci/index.js";
import { TERRAFORM_IMAGES } from "./terraform-images.fixture.js";
import { vendored } from "./vendored.js";

describe("corpus: gitlab-org/terraform-images", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await vendored("terraform-images.yml"));

    expect(parse(render(TERRAFORM_IMAGES, { header: "" }))).toStrictEqual(upstream);
  });
});
