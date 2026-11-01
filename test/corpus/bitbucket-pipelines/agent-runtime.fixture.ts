import {
  type PipelineConfig,
  pipe,
  pipelineConfig,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/**
 * The agent runtime, written through the public API from the pinned schema alone. No real config
 * and no Atlassian page documents the keys, so nothing here is corpus-backed; `PROVENANCE.md`
 * records the schema and its copy date.
 *
 * Two definitions cover the two arms of `permissions.on-ask`, because one key holds either a mode
 * or a rules map. The step's script mixes a command, a pipe and an agent task, and the task repeats
 * every optional key so the task form is exercised beside the definition form.
 */
export const AGENT_RUNTIME: PipelineConfig = pipelineConfig({
  definitions: {
    agents: {
      "release-agent": {
        config: {
          overrides: { model: "claude-sonnet", "max-turns": 8 },
          path: "agent/release.yml",
        },
        permissions: {
          "on-ask": {
            allow: ["read:repository"],
            default: "deny",
            deny: ["write:repository"],
          },
        },
        prompt: "Review the change and summarise the risk.",
        provider: "rovodev",
        "setup-script": [
          "npm ci",
          pipe({
            pipe: "atlassian/npm:1",
            variables: { NPM_TOKEN: "${NPM_TOKEN}", FLAGS: ["--quiet", "--no-audit"] },
          }),
        ],
        "use-legacy-mcp": false,
      },
      "audit-agent": {
        permissions: { "on-ask": "allow" },
        prompt: "Audit the dependency tree.",
        provider: "claude",
      },
    },
  },
  pipelines: {
    default: [
      step({
        name: "Agent review",
        script: [
          "npm ci",
          pipe({ pipe: "atlassian/npm:1", variables: { NPM_TOKEN: "${NPM_TOKEN}" } }),
          {
            agent: "release-agent",
            config: {
              overrides: { mode: "strict" },
              path: "agent/task.yml",
            },
            permissions: { "on-ask": "deny" },
            prompt: "Review only the changed files.",
            provider: "codex",
            "use-legacy-mcp": true,
          },
        ],
      }),
    ],
  },
});
