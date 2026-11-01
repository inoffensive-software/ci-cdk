import { GITLAB_PAGES_JOB_DEBT } from "./gitlab-pages-job-debt.js";
import { GITLAB_PAGES_DEBT } from "./gitlab-pages-debt.js";
import { GITLAB_SECRETS_DEBT } from "./gitlab-secrets-debt.js";
import { GITLAB_TOKENS_DEBT } from "./gitlab-tokens-debt.js";
import { LABKIT_DEBT } from "./labkit-debt.js";
import { TERRAFORM_IMAGES_DEBT } from "./terraform-images-debt.js";

/** One raw path a fixture needs, with the reason it is there. */
export interface CoverageDebt {
  readonly path: string;
  readonly reason: string;
}

/**
 * The roadmap. Every raw path a fixture is allowed to use, exactly: adding a row is a deliberate
 * change, and removing one is the definition of closing a gap. Paths use the diagnostic notation and
 * name the raw entry the author wrote, not the modelled key it stands in for.
 *
 * A row is always a vocabulary gap: the key has no modelled field. An empty ledger means the
 * vocabulary can express every key the corpus uses.
 *
 * One list per entry, because a job's rows are addressed by that fixture's job indexes: the union is
 * the ledger the coverage test and the gate compare against.
 */
export const COVERAGE_DEBT: readonly CoverageDebt[] = [
  ...TERRAFORM_IMAGES_DEBT,
  ...LABKIT_DEBT,
  ...GITLAB_PAGES_DEBT,
  ...GITLAB_PAGES_JOB_DEBT,
  ...GITLAB_SECRETS_DEBT,
  ...GITLAB_TOKENS_DEBT,
];
