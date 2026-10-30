import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

interface VendoredSchema {
  readonly file: string;
  readonly sha256: string;
  readonly id: string;
}

/**
 * The pinned bytes of each vendored schema. The copy is never edited: a refresh downloads the
 * upstream blob again and updates this table and the `docs/references/upstream-schemas.md` row in
 * the same change. A hash that moves without that change means the schema changed under the
 * goldens, which is the thing this test exists to catch.
 */
const VENDORED: readonly VendoredSchema[] = [
  {
    file: "gitlab-ci.json",
    sha256: "1c6eeb7d3a34c39996afbfe1ade220480eb05bbeae674e86d3c745dfeeded7fd",
    id: "https://gitlab.com/.gitlab-ci.yml",
  },
];

const bytesOf = (schema: VendoredSchema): Buffer =>
  readFileSync(join(ROOT, "test", "schemas", schema.file));

describe("vendored schemas", () => {
  it.each(VENDORED)("$file is byte-identical to its pinned source", (schema: VendoredSchema) => {
    expect(createHash("sha256").update(bytesOf(schema)).digest("hex")).toBe(schema.sha256);
  });

  it.each(VENDORED)("$file keeps its upstream $id", (schema: VendoredSchema) => {
    expect(bytesOf(schema).toString("utf8")).toContain(`"$id": "${schema.id}"`);
  });
});
