import type { Text, Value } from "../core/index.js";
import type { Pipe } from "./pipe-types.js";

/** How an agent responds when it asks for a permission. */
export type AgentPermissionMode = "allow" | "deny";

/** The permission rules that override a default mode. A rule is a single-line pattern. */
export interface AgentPermissionsOnAskRules {
  readonly allow?: readonly Text[];
  readonly default?: AgentPermissionMode;
  readonly deny?: readonly Text[];
}

/** A single mode, or a default with allow and deny overrides. */
export type AgentPermissionsOnAsk = AgentPermissionMode | AgentPermissionsOnAskRules;

/** How an agent treats a permission request. */
export interface AgentPermissions {
  readonly "on-ask"?: AgentPermissionsOnAsk;
}

/** The runtime an agent task runs on. */
export type AgentProvider = "rovodev" | "claude" | "codex";

/** An agent's config: a file path, inline overrides, or both. */
export interface AgentConfig {
  readonly overrides?: Readonly<Record<string, Value>>;
  readonly path?: Text;
}

/** A command or a pipe in an agent's setup script; an agent task is never a setup item. */
export type AgentSetupItem = Text | Pipe;

/**
 * A reusable agent definition: the prompt it runs and the optional config, permissions, provider,
 * setup script and legacy-MCP switch. The shape is the pinned schema's `agent_definition`; no
 * corpus config and no Atlassian page documents these keys.
 */
export interface AgentDefinition {
  readonly config?: AgentConfig;
  readonly permissions?: AgentPermissions;
  readonly prompt: Text;
  readonly provider?: AgentProvider;
  readonly "setup-script"?: readonly AgentSetupItem[];
  readonly "use-legacy-mcp"?: boolean;
}

/**
 * One agent task inside a script sequence: the definition it names and the optional overrides it
 * applies. The shape is the pinned schema's `agent_task`; the agent name is emitted as written and
 * never resolved, because definitions are not loaded.
 */
export interface AgentTask {
  readonly agent: Text;
  readonly config?: AgentConfig;
  readonly permissions?: AgentPermissions;
  readonly prompt?: Text;
  readonly provider?: AgentProvider;
  readonly "use-legacy-mcp"?: boolean;
}
