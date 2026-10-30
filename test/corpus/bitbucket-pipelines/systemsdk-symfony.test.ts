import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/bitbucket-pipelines/index.js";
import { readVendored } from "../vendored.js";
import { SYSTEMSDK_SYMFONY } from "./systemsdk-symfony.fixture.js";

describe("corpus: systemsdk/docker-nginx-php-symfony", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "systemsdk-symfony.yml"));

    expect(parse(render(SYSTEMSDK_SYMFONY, { header: "" }))).toStrictEqual(upstream);
  });
});
