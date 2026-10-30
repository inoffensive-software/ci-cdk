import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The vendored bytes for a corpus entry, read from the provider directory that pins it. Callers pass
 * their own `import.meta.dirname`, so the helper stays provider-neutral.
 */
export const readVendored = (directory: string, name: string): Promise<string> =>
  readFile(join(directory, name), "utf8");
