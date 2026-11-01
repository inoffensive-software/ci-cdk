/**
 * Every report key GitLab documents, in a deliberately non-alphabetical order so the inventory also
 * proves that lowering preserves the author's order. List-valued reports use a list so the schema's
 * item path is modelled at both levels; `coverage_report` uses its one map form.
 */
export const ARTIFACT_REPORTS = {
  accessibility: "accessibility.json",
  annotations: "annotations.json",
  api_fuzzing: ["api-fuzzing.json"],
  browser_performance: "browser-performance.json",
  codequality: ["gl-code-quality-report.json"],
  container_scanning: ["container-scanning.json"],
  coverage_fuzzing: ["coverage-fuzzing.json"],
  coverage_report: { coverage_format: "cobertura", path: "coverage/cobertura-coverage.xml" },
  cyclonedx: ["cyclonedx.json"],
  dast: ["dast.json"],
  dependency_scanning: ["dependency-scanning.json"],
  dotenv: ["build.env"],
  junit: ["report.xml"],
  license_management: ["license-management.json"],
  license_scanning: ["license-scanning.json"],
  load_performance: ["load-performance.json"],
  lsif: ["lsif.json"],
  metrics: ["metrics.txt"],
  repository_xray: ["repository-xray.json"],
  requirements: ["requirements.json"],
  sarif: ["sarif.json"],
  sast: ["sast.json"],
  secret_detection: ["secret-detection.json"],
  terraform: ["terraform.json"],
} as const;
