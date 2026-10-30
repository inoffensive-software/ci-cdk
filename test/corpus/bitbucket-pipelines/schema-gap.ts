import { readFileSync } from "node:fs";

import { render } from "../../../src/bitbucket-pipelines/index.js";
import { schemaFromText, walkSchema } from "../../schemas/walk.js";
import { inventoryPaths } from "../gate.js";
import { AUTHOR_NAMED, keyPaths } from "./exhaustiveness.js";
import { INVENTORY } from "./inventory.js";

export { GAPS, GAP_CATEGORIES, OVERCLAIMS } from "./schema-gap-debt.js";

export type { Gap, Overclaim } from "./schema-gap-debt.js";

export {
  gapRemedies,
  orphanedGapPaths,
  staleGapPaths,
  staleGapRemedies,
  subsumes,
  undeclaredOverclaimPaths,
  undeclaredSchemaPaths,
  unusedOverclaimPaths,
} from "../../schemas/schema-gap.js";

/**
 * The documented grammar: every key path the vendored schema allows from its root, normalised by the
 * walker's author-named rule so the two sets are comparable. The schema's root is a single `$ref`
 * into `definitions.pipelines_configuration`, so the walk resolves that one pointer and reads the
 * document from there; the author-named list is the exhaustiveness gate's own, so a name the author
 * chooses compares as one position on both sides.
 */
export const SCHEMA_PATHS: readonly string[] = walkSchema(
  schemaFromText(
    readFileSync(new URL("../../schemas/bitbucket-pipelines.json", import.meta.url), "utf8"),
  ),
  AUTHOR_NAMED,
);

/** The modelled set, derived exactly as the exhaustiveness gate derives it. */
export const MODELLED_PATHS: readonly string[] = inventoryPaths({
  fixtures: INVENTORY,
  renderOf: (document) => render(document.config, { header: "" }),
  keyPaths,
});
