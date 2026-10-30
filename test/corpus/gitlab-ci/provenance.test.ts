import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const dir = import.meta.dirname;

/** `Vendored as: \`<file>\`, SHA-256 \`<hash>\``, which may wrap across lines in the markdown. */
const RECORDED = /Vendored as: `([^`]+)`, SHA-256\s+`([0-9a-f]{64})`/gu;

interface Recorded {
  readonly file: string;
  readonly hash: string;
}

const recordedHashes = async (): Promise<readonly Recorded[]> => {
  const markdown = await readFile(join(dir, "PROVENANCE.md"), "utf8");

  return [...markdown.matchAll(RECORDED)].map((match) => ({
    file: match[1] ?? "",
    hash: match[2] ?? "",
  }));
};

describe("provenance", () => {
  it("pins every vendored file to the hash recorded for it", async () => {
    const recorded = await recordedHashes();

    expect(recorded).not.toHaveLength(0);

    for (const entry of recorded) {
      const bytes = await readFile(join(dir, entry.file));
      const actual = createHash("sha256").update(bytes).digest("hex");

      expect([entry.file, actual]).toStrictEqual([entry.file, entry.hash]);
    }
  });
});
