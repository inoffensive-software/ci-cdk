import { readFileSync } from "node:fs";

import { render } from "@inoffensive/ci-cdk/gitlab-ci";
import { schemaFromText, walkSchema } from "../../schemas/walk.js";
import { inventoryPaths } from "../gate.js";
import { AUTHOR_NAMED, keyPaths } from "./exhaustiveness.js";
import { INVENTORY } from "./inventory.js";

export { GAPS, OVERCLAIMS } from "./schema-gap-debt.js";

export type { Gap, Overclaim } from "./schema-gap-debt.js";

export type { GapCategory } from "../../schemas/gap-debt.js";

export { GAP_CATEGORIES } from "../../schemas/gap-debt.js";

export {
  gapRemedies,
  orphanedGapPaths,
  staleGapPaths,
  staleGapRemedies,
  undeclaredOverclaimPaths,
  undeclaredSchemaPaths,
  unusedOverclaimPaths,
} from "../../schemas/schema-gap.js";

/**
 * GitLab's root mixes pipeline keywords with job names. The schema states the rule itself: every
 * keyword is a named property, and `additionalProperties` carries `job`, so a named key stays literal
 * and any other key becomes `$.*`. Hidden templates are a `patternProperties` branch at the same
 * root, which is the same wildcard, so they can neither add a path nor hide one. The author-named
 * list is the gate's own, so a scalar map's keys compare as one position on both sides.
 */

/**
 * The root `pages` property is a job body under its own name, so its key paths are the job-name
 * wildcard's paths. Mapping the prefix before comparison keeps one spelling per position: `$.pages`
 * becomes `$.*`, `$.pages.script` becomes `$.*.script`, and the duplicate the schema declares
 * collapses onto the `additionalProperties: job` branch. Job-level `$.*.pages` is untouched: that is
 * the `pages` keyword inside a job body, which ticket 102 owns.
 */
const ROOT_PAGES = "$.pages";
const JOB_NAME = "$.*";

const asJobName = (path: string): string => {
  if (path === ROOT_PAGES) {
    return JOB_NAME;
  }

  if (path.startsWith(`${ROOT_PAGES}.`) || path.startsWith(`${ROOT_PAGES}[`)) {
    return `${JOB_NAME}${path.slice(ROOT_PAGES.length)}`;
  }

  return path;
};

/** The schema's paths with the root `pages` job mapped onto the job-name wildcard, deduped. */
export const normaliseSchemaPaths = (paths: readonly string[]): readonly string[] =>
  [...new Set(paths.map(asJobName))].toSorted();

/**
 * The walker applies the author-named rule in the notation the schema declares, so a job map the
 * list names at `$.*` is also named inside the root `pages` job. Deriving the aliases here keeps the
 * list single-sourced: no `$.pages` entry is written by hand.
 */
const SCHEMA_AUTHOR_NAMED: readonly string[] = [
  ...AUTHOR_NAMED,
  ...AUTHOR_NAMED.filter((path) => path.startsWith("$.*.")).map(
    (path) => `${ROOT_PAGES}${path.slice(JOB_NAME.length)}`,
  ),
];

/**
 * The documented grammar: every key path the vendored schema allows from its root, normalised by the
 * walker's author-named rule and by the root `pages` job rule, so the set is comparable with the
 * modelled one.
 */
export const SCHEMA_PATHS: readonly string[] = normaliseSchemaPaths(
  walkSchema(
    schemaFromText(readFileSync(new URL("../../schemas/gitlab-ci.json", import.meta.url), "utf8")),
    SCHEMA_AUTHOR_NAMED,
  ),
);

/** The modelled set, derived exactly as the exhaustiveness gate derives it. */
export const MODELLED_PATHS: readonly string[] = inventoryPaths({
  fixtures: INVENTORY,
  renderOf: (document) => render(document.pipeline, { header: "" }),
  keyPaths,
});
