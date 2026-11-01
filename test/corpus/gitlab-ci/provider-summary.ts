import type { ProviderSummary } from "../provider-summary.js";
import { GAPS, OVERCLAIMS, SCHEMA_PATHS } from "./schema-gap.js";

export const GITLAB_SUMMARY: ProviderSummary = {
  name: "GitLab CI",
  subpath: "@inoffensive/ci-cdk/gitlab-ci",
  document: "docs/providers/gitlab-ci.md",
  documented: SCHEMA_PATHS.length,
  gaps: GAPS,
  overclaims: OVERCLAIMS.length,
};
