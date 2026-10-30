import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/bitbucket-pipelines/index.js";
import { readVendored } from "../vendored.js";
import { CUSTOM_VARS_SALESFORCE } from "./custom-vars-salesforce.fixture.js";

/**
 * The pinned schema types every custom-variable value as a string, while this config writes its
 * booleans as literals. Both sides parse under the failsafe schema, so the comparison keeps the text
 * the file carries; the fixture writes that text quoted, so the emitted file stays schema-valid.
 */
describe("corpus: dawiddiwad/salesforce-e2e-test-automation", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "custom-vars-salesforce.yml"), {
      schema: "failsafe",
    });

    expect(
      parse(render(CUSTOM_VARS_SALESFORCE, { header: "" }), { schema: "failsafe" }),
    ).toStrictEqual(upstream);
  });
});
