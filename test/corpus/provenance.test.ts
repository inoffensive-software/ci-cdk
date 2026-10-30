import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const CORPUS = import.meta.dirname;
const PROVENANCE = "PROVENANCE.md";

/** `Vendored as: \`<file>\`, SHA-256 \`<hash>\``, which may wrap across lines in the markdown. */
const RECORDED = /Vendored as: `([^`]+)`, SHA-256\s+`([0-9a-f]{64})`/gu;

interface Recorded {
  readonly file: string;
  readonly hash: string;
}

interface Provider {
  readonly name: string;
  readonly directory: string;
}

/** Every provider directory that pins entries, so a new provider is covered without a new test. */
const providers = async (): Promise<readonly Provider[]> => {
  const entries = await readdir(CORPUS, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const pinned: Provider[] = [];

  for (const name of directories.toSorted()) {
    const directory = join(CORPUS, name);
    const contents = await readdir(directory);

    if (contents.includes(PROVENANCE)) {
      pinned.push({ name, directory });
    }
  }

  return pinned;
};

const recordedHashes = async (provider: Provider): Promise<readonly Recorded[]> => {
  const markdown = await readFile(join(provider.directory, PROVENANCE), "utf8");

  return [...markdown.matchAll(RECORDED)].map((match) => ({
    file: match[1] ?? "",
    hash: match[2] ?? "",
  }));
};

const PROVIDERS = await providers();

describe("provenance", () => {
  it("finds at least one provider that pins entries", () => {
    expect(PROVIDERS).not.toHaveLength(0);
  });

  it.each(PROVIDERS)(
    "$name pins every vendored file to the hash recorded for it",
    async (provider: Provider) => {
      const recorded = await recordedHashes(provider);

      expect(recorded).not.toHaveLength(0);

      for (const entry of recorded) {
        const bytes = await readFile(join(provider.directory, entry.file));
        const actual = createHash("sha256").update(bytes).digest("hex");

        expect([entry.file, actual]).toStrictEqual([entry.file, entry.hash]);
      }
    },
  );
});
