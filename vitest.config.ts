import { join } from "node:path";

import { defineConfig, type ViteUserConfig } from "vitest/config";

/** A source file, addressed from this config, so tests never need the build output. */
const sourceOf = (path: string): string => join(import.meta.dirname, path);

const config: ViteUserConfig = defineConfig({
  resolve: {
    alias: [
      { find: /^@inoffensive\/ci-cdk$/u, replacement: sourceOf("src/index.ts") },
      { find: /^@inoffensive\/ci-cdk\/([^/]+)$/u, replacement: sourceOf("src/$1/index.ts") },
    ],
  },
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
  },
});

export default config;
