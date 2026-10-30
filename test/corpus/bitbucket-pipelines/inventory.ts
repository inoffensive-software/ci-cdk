import {
  type NamedPipeline,
  type PipelineConfig,
  type SelectorPipeline,
  pipelineConfig,
  step,
} from "../../../src/bitbucket-pipelines/index.js";
import { everyDefinedStep, everyItems } from "./inventory-items.js";

/** One inventory document: a configuration, plus the name a failure should use for it. */
export interface InventoryDocument {
  readonly name: string;
  readonly config: PipelineConfig;
}

/** A selector entry is the same body under every pattern, so the section repeats one shape. */
const selector = (pattern: string): SelectorPipeline => ({ pattern, pipeline: everyItems() });

/** A custom pipeline differs only in naming its trigger. */
const named = (name: string): NamedPipeline => ({ name, pipeline: everyItems() });

/**
 * The documents that between them exercise every key the vocabulary can emit, in every position the
 * provider repeats. One document carries everything that can coexist; root `image` shapes and
 * `clone.depth` forms that cannot share a document with another get their own.
 *
 * The gate renders each document, parses the result and unions the key paths, so this file is the
 * single definition of "modelled". It must not use `raw`; a key it cannot reach through a field is a
 * gap in the vocabulary, not a reason to widen the inventory.
 */
export const INVENTORY: readonly InventoryDocument[] = [
  {
    name: "main",
    config: pipelineConfig({
      clone: { depth: 50, enabled: true, lfs: true, "skip-ssl-verify": true },
      definitions: {
        caches: {
          "node-modules": "node_modules",
          "build-output": { path: "dist", key: { files: ["yarn.lock", "package.json"] } },
        },
        services: {
          database: {
            image: "postgres:17",
            memory: 2048,
            type: "docker",
            variables: { POSTGRES_DB: "app" },
          },
        },
        steps: everyDefinedStep(),
      },
      image: { name: "node:24", username: "builder", password: "${REGISTRY_PASSWORD}" },
      options: { docker: true, "max-time": 120, "runs-on": ["self.hosted", "linux"], size: "4x" },
      pipelines: {
        default: everyItems(),
        branches: [selector("main"), selector("release/*")],
        tags: [selector("*")],
        "pull-requests": [selector("**")],
        custom: [named("cleanup")],
      },
    }),
  },
  {
    name: "image-string",
    config: pipelineConfig({
      clone: { depth: "full" },
      image: "node:24",
      pipelines: { default: [step({ script: ["true"] })] },
    }),
  },
  {
    name: "image-name",
    config: pipelineConfig({
      image: { name: "node:22" },
      pipelines: { default: [step({ script: ["true"] })] },
    }),
  },
];
