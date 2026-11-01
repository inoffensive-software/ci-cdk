import { type AgentDefinition, pipe } from "../../../src/bitbucket-pipelines/index.js";

/**
 * The agent definitions every key at once. Two definitions cover the two arms of
 * `permissions.on-ask`, because one value holds either a mode or a rules map; a definition also
 * carries a setup script, whose pipe keeps its variables map.
 */
export const AGENT_DEFINITIONS: Readonly<Record<"release-agent" | "audit-agent", AgentDefinition>> =
  {
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
          variables: { NPM_TOKEN: "${NPM_TOKEN}", FLAGS: ["--quiet"] },
        }),
      ],
      "use-legacy-mcp": false,
    },
    "audit-agent": {
      permissions: { "on-ask": "allow" },
      prompt: "Audit the dependency tree.",
      provider: "claude",
    },
  };
