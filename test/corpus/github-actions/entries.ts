import type { Workflow } from "../../../src/github-actions/index.js";
import { ANYHOW } from "./anyhow.fixture.js";
import { CURL_CHECKSRC } from "./curl-checksrc.fixture.js";
import { GOT } from "./got.fixture.js";
import { MINDEE_CRON } from "./mindee-cron.fixture.js";
import { MISE_PUBLISH_VERSION } from "./mise-publish-version.fixture.js";
import { MLFLOW_JS } from "./mlflow-js.fixture.js";
import { PRISMA_CODE_SECURITY } from "./prisma-code-security.fixture.js";
import { TRPC_MAIN } from "./trpc-main.fixture.js";
import { TRPC_RELEASE } from "./trpc-release.fixture.js";
import { TURBO_LSP } from "./turbo-lsp.fixture.js";
import { UV_AI_POLICY } from "./uv-ai-policy.fixture.js";

export interface Entry {
  readonly name: string;
  readonly file: string;
  readonly workflow: Workflow;
}

export const ENTRIES: readonly Entry[] = [
  { name: "got", file: "got.yml", workflow: GOT },
  { name: "curl-checksrc", file: "curl-checksrc.yml", workflow: CURL_CHECKSRC },
  { name: "anyhow", file: "anyhow.yml", workflow: ANYHOW },
  { name: "trpc-main", file: "trpc-main.yml", workflow: TRPC_MAIN },
  { name: "trpc-release", file: "trpc-release.yml", workflow: TRPC_RELEASE },
  { name: "turbo-lsp", file: "turbo-lsp.yml", workflow: TURBO_LSP },
  {
    name: "prisma-code-security",
    file: "prisma-code-security.yml",
    workflow: PRISMA_CODE_SECURITY,
  },
  { name: "mlflow-js", file: "mlflow-js.yml", workflow: MLFLOW_JS },
  { name: "mindee-cron", file: "mindee-cron.yml", workflow: MINDEE_CRON },
  { name: "uv-ai-policy", file: "uv-ai-policy.yml", workflow: UV_AI_POLICY },
  {
    name: "mise-publish-version",
    file: "mise-publish-version.yml",
    workflow: MISE_PUBLISH_VERSION,
  },
];
