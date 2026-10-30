import { readFileSync } from "node:fs";

import { render } from "../../../src/github-actions/index.js";
import { schemaFromText, walkSchema } from "../../schemas/walk.js";
import { inventoryPaths } from "../gate.js";
import { AUTHOR_NAMED, keyPaths } from "./exhaustiveness.js";
import { INVENTORY } from "./inventory.js";

export { GAPS, GAP_CATEGORIES, OVERCLAIMS } from "./schema-gap-debt.js";

export type { Gap, Overclaim } from "./schema-gap-debt.js";

export {
  gapRemedies,
  orphanedGapPaths,
  undeclaredOverclaimPaths,
  undeclaredSchemaPaths,
  unusedOverclaimPaths,
} from "../../schemas/schema-gap.js";

/**
 * The documented grammar: every key path the vendored schema allows from its root, normalised by the
 * same author-named list the exhaustiveness gate uses so the two sets are comparable.
 */
export const SCHEMA_PATHS: readonly string[] = walkSchema(
  schemaFromText(
    readFileSync(new URL("../../schemas/github-actions.json", import.meta.url), "utf8"),
  ),
  AUTHOR_NAMED,
);

/** The modelled set, derived exactly as the exhaustiveness gate derives it. */
export const MODELLED_PATHS: readonly string[] = inventoryPaths({
  fixtures: INVENTORY,
  renderOf: (document) => render(document.workflow, { header: "" }),
  keyPaths,
});
