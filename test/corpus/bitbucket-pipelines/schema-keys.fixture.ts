import {
  type PipelineConfig,
  pipelineConfig,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/** The schema-derived keys: a document's labels map and a step's auth scopes. */
export const SCHEMA_KEYS: PipelineConfig = pipelineConfig({
  labels: { team: "platform", tier: "backend" },
  pipelines: {
    default: [
      step({
        auth: { system: { scopes: ["repository:write", "pullrequest:write"] } },
        script: ["true"],
      }),
    ],
  },
});
