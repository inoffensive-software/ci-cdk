import type { ProviderSummary } from "../provider-summary.js";
import { GAPS, OVERCLAIMS, SCHEMA_PATHS } from "./schema-gap.js";

export const GITHUB_SUMMARY: ProviderSummary = {
  name: "GitHub Actions",
  subpath: "@inoffensive/ci-cdk/github-actions",
  document: "docs/providers/github-actions.md",
  documented: SCHEMA_PATHS.length,
  gaps: GAPS,
  overclaims: OVERCLAIMS.length,
};
