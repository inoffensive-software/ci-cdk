import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/bitbucket-pipelines/index.js";
import { problemsFor } from "../../schemas/validate.js";
import { AGENT_RUNTIME } from "./agent-runtime.fixture.js";

const rendered = (): string => render(AGENT_RUNTIME, { header: "" });

/** The pinned schema's `agent_definition` and `agent_task` shapes, key for key. */
const EXPECTED_DATA = {
  definitions: {
    agents: {
      "audit-agent": {
        permissions: { "on-ask": "allow" },
        prompt: "Audit the dependency tree.",
        provider: "claude",
      },
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
          {
            pipe: "atlassian/npm:1",
            variables: { NPM_TOKEN: "${NPM_TOKEN}", FLAGS: ["--quiet", "--no-audit"] },
          },
        ],
        "use-legacy-mcp": false,
      },
    },
  },
  pipelines: {
    default: [
      {
        step: {
          name: "Agent review",
          script: [
            "npm ci",
            { pipe: "atlassian/npm:1", variables: { NPM_TOKEN: "${NPM_TOKEN}" } },
            {
              agent: "release-agent",
              config: { overrides: { mode: "strict" }, path: "agent/task.yml" },
              permissions: { "on-ask": "deny" },
              prompt: "Review only the changed files.",
              provider: "codex",
              "use-legacy-mcp": true,
            },
          ],
        },
      },
    ],
  },
};

describe("schema-derived agent runtime", () => {
  it("parses back to the definition and task the schema describes", () => {
    expect(parse(rendered())).toStrictEqual(EXPECTED_DATA);
  });

  it("keeps the script's author order across commands, pipes and agent tasks", () => {
    const script = parse(rendered()).pipelines.default[0].step.script;

    expect(script.map((item: string | { readonly agent?: string }) => typeof item)).toStrictEqual([
      "string",
      "object",
      "object",
    ]);
    expect(script[2].agent).toBe("release-agent");
  });

  it("emits definitions and agent keys in the schema's alphabetical order", () => {
    const parsed = parse(rendered());

    expect(Object.keys(parsed.definitions)).toStrictEqual(["agents"]);
    expect(Object.keys(parsed.definitions.agents["release-agent"])).toStrictEqual([
      "config",
      "permissions",
      "prompt",
      "provider",
      "setup-script",
      "use-legacy-mcp",
    ]);
    expect(Object.keys(parsed.pipelines.default[0].step.script[2])).toStrictEqual([
      "agent",
      "config",
      "permissions",
      "prompt",
      "provider",
      "use-legacy-mcp",
    ]);
  });

  it("validates against the pinned schema", () => {
    expect(problemsFor("bitbucket-pipelines", rendered())).toStrictEqual([]);
  });
});
