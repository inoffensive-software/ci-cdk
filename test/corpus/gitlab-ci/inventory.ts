import { type Pipeline, job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

/** One inventory document: a definition, plus the name a failure should use for it. */
export interface InventoryDocument {
  readonly name: string;
  readonly pipeline: Pipeline;
}

/**
 * The definitions that between them exercise every key the vocabulary can emit, and nothing else. The
 * gate renders each one, parses the result and unions the key paths, so this file is the single
 * definition of "modelled". It must not use `raw`: a key it cannot reach through a field is a gap in
 * the vocabulary, not a reason to widen the inventory.
 *
 * The hidden template is here to prove the gate's treatment of author data: its keys are `.`-prefixed
 * at the document root and therefore never enter the modelled set.
 */
export const INVENTORY: readonly InventoryDocument[] = [
  {
    name: "main",
    pipeline: pipeline({
      stages: ["build"],
      templates: { ".setup": { script: ["npm ci"] } },
      // Both script shapes, because a sequence adds a path of its own to the modelled set.
      jobs: [
        job({ name: "build", stage: "build", script: "npm run build" }),
        job({ name: "test", stage: "build", script: ["npm ci", "npm test"] }),
      ],
    }),
  },
];
