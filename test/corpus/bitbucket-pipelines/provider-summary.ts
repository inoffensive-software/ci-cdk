import type { ProviderSummary } from "../provider-summary.js";
import { GAPS, OVERCLAIMS, SCHEMA_PATHS } from "./schema-gap.js";

export const BITBUCKET_SUMMARY: ProviderSummary = {
  name: "Bitbucket Pipelines",
  subpath: "@inoffensive/ci-cdk/bitbucket-pipelines",
  document: "docs/providers/bitbucket-pipelines.md",
  documented: SCHEMA_PATHS.length,
  gaps: GAPS,
  overclaims: OVERCLAIMS.length,
};
