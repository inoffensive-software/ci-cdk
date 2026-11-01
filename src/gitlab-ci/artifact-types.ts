import type { Text } from "../core/index.js";

/** The access levels GitLab documents for `artifacts:access`. */
export type ArtifactAccess = "none" | "developer" | "maintainer" | "all";

/** The map form of `artifacts:reports:coverage_report`; both keys are optional in the schema. */
export interface CoverageReport {
  readonly coverage_format?: "cobertura" | "jacoco";
  readonly path?: Text;
}

/**
 * The report keys GitLab documents. The three scalar-only reports stay text; every other report is
 * one path or an ordered list of paths. `coverage_report` is the one map-valued report.
 */
export interface ArtifactReports {
  readonly accessibility?: Text;
  readonly annotations?: Text;
  readonly api_fuzzing?: Text | readonly Text[];
  readonly browser_performance?: Text;
  readonly codequality?: Text | readonly Text[];
  readonly container_scanning?: Text | readonly Text[];
  readonly coverage_fuzzing?: Text | readonly Text[];
  readonly coverage_report?: CoverageReport;
  readonly cyclonedx?: Text | readonly Text[];
  readonly dast?: Text | readonly Text[];
  readonly dependency_scanning?: Text | readonly Text[];
  readonly dotenv?: Text | readonly Text[];
  readonly junit?: Text | readonly Text[];
  readonly license_management?: Text | readonly Text[];
  readonly license_scanning?: Text | readonly Text[];
  readonly load_performance?: Text | readonly Text[];
  readonly lsif?: Text | readonly Text[];
  readonly metrics?: Text | readonly Text[];
  readonly repository_xray?: Text | readonly Text[];
  readonly requirements?: Text | readonly Text[];
  readonly sarif?: Text | readonly Text[];
  readonly sast?: Text | readonly Text[];
  readonly secret_detection?: Text | readonly Text[];
  readonly terraform?: Text | readonly Text[];
}
