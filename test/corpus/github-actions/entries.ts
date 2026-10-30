import type { Workflow } from "../../../src/github-actions/index.js";
import { ANYHOW } from "./anyhow.fixture.js";
import { GOT } from "./got.fixture.js";
import { PRISMA_CODE_SECURITY } from "./prisma-code-security.fixture.js";
import { TRPC_MAIN } from "./trpc-main.fixture.js";
import { TRPC_RELEASE } from "./trpc-release.fixture.js";
import { TURBO_LSP } from "./turbo-lsp.fixture.js";

export interface Entry {
  readonly name: string;
  readonly file: string;
  readonly workflow: Workflow;
}

export const ENTRIES: readonly Entry[] = [
  { name: "got", file: "got.yml", workflow: GOT },
  { name: "anyhow", file: "anyhow.yml", workflow: ANYHOW },
  { name: "trpc-main", file: "trpc-main.yml", workflow: TRPC_MAIN },
  { name: "trpc-release", file: "trpc-release.yml", workflow: TRPC_RELEASE },
  { name: "turbo-lsp", file: "turbo-lsp.yml", workflow: TURBO_LSP },
  {
    name: "prisma-code-security",
    file: "prisma-code-security.yml",
    workflow: PRISMA_CODE_SECURITY,
  },
];
