import { pipelineConfig, step } from "../../../src/bitbucket-pipelines/index.js";
import { everyChildFinal } from "./inventory-items.js";
import type { InventoryDocument } from "./inventory.js";

/** The two items a child-final document needs: an inline step, then the child-shaped final step. */
const childFinalItems = () => [step({ script: ["true"] }), everyChildFinal()];

/**
 * The child final shape in every section, one document per group. A pipeline holds exactly one final
 * step and it must be last, so the inline final step's documents cannot carry this shape as well.
 */
export const CHILD_FINAL_DOCUMENTS: readonly InventoryDocument[] = [
  {
    name: "child-final",
    config: pipelineConfig({ pipelines: { default: childFinalItems() } }),
  },
  {
    name: "child-final-sections",
    config: pipelineConfig({
      pipelines: {
        branches: [{ pattern: "main", pipeline: childFinalItems() }],
        tags: [{ pattern: "*", pipeline: childFinalItems() }],
        "pull-requests": [{ pattern: "**", pipeline: childFinalItems() }],
      },
    }),
  },
  {
    name: "child-final-custom",
    config: pipelineConfig({
      pipelines: { custom: [{ name: "publish", pipeline: childFinalItems() }] },
    }),
  },
];
