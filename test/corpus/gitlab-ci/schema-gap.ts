import { readFileSync } from "node:fs";

import { render } from "@inoffensive/ci-cdk/gitlab-ci";
import { schemaFromText, walkSchema } from "../../schemas/walk.js";
import { inventoryPaths } from "../gate.js";
import { AUTHOR_NAMED, keyPaths } from "./exhaustiveness.js";
import { INVENTORY } from "./inventory.js";

export { GAPS, OVERCLAIMS } from "./schema-gap-debt.js";

export type { Gap, Overclaim } from "./schema-gap-debt.js";

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
 * The documented grammar: every key path the vendored schema allows from its root, normalised by the
 * walker's author-named rule so the two sets are comparable.
 */
export const SCHEMA_PATHS: readonly string[] = walkSchema(
  schemaFromText(readFileSync(new URL("../../schemas/gitlab-ci.json", import.meta.url), "utf8")),
  AUTHOR_NAMED,
);

/** The modelled set, derived exactly as the exhaustiveness gate derives it. */
export const MODELLED_PATHS: readonly string[] = inventoryPaths({
  fixtures: INVENTORY,
  renderOf: (document) => render(document.pipeline, { header: "" }),
  keyPaths,
});
