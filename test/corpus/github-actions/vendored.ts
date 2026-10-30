import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** The vendored bytes for a corpus entry, read from beside the test that compares them. */
export const vendored = (name: string): Promise<string> =>
  readFile(join(import.meta.dirname, name), "utf8");
