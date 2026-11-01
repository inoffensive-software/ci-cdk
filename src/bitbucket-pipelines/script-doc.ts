import { entry, fromValue, map, seq, type Doc } from "../core/index.js";
import type {
  AgentConfig,
  AgentDefinition,
  AgentPermissions,
  AgentPermissionsOnAsk,
  AgentSetupItem,
  AgentTask,
} from "./agent-types.js";
import type { Pipe } from "./pipe-types.js";
import type { ScriptItem } from "./types.js";

const isPipe = (item: ScriptItem | AgentSetupItem): item is Pipe =>
  typeof item !== "string" && "pipe" in item;

const isAgentTask = (item: ScriptItem): item is AgentTask =>
  typeof item !== "string" && "agent" in item;

/** Pipe keys in schema order; variable maps keep the author's insertion order. */
const pipeDoc = (item: Pipe): Doc =>
  map([
    { key: "pipe", value: fromValue(item.pipe) },
    ...entry("variables", item.variables === undefined ? undefined : fromValue(item.variables)),
  ]);

/** An agent config: `overrides` then `path`, the schema's alphabetical order. */
const agentConfigDoc = (config: AgentConfig | undefined): Doc | undefined => {
  if (config === undefined) {
    return undefined;
  }

  return map([
    ...entry("overrides", config.overrides === undefined ? undefined : fromValue(config.overrides)),
    ...entry("path", config.path === undefined ? undefined : fromValue(config.path)),
  ]);
};

/** The rules arm of `on-ask`: `allow`, `default`, `deny`; the mode arm is a plain string. */
const onAskRulesDoc = (rules: Exclude<AgentPermissionsOnAsk, string>): Doc =>
  map([
    ...entry("allow", rules.allow === undefined ? undefined : fromValue(rules.allow)),
    ...entry("default", rules.default === undefined ? undefined : fromValue(rules.default)),
    ...entry("deny", rules.deny === undefined ? undefined : fromValue(rules.deny)),
  ]);

/** Permissions carry one `on-ask` value, either a mode or a rules map. */
const onAskDoc = (onAsk: AgentPermissionsOnAsk): Doc =>
  typeof onAsk === "string" ? fromValue(onAsk) : onAskRulesDoc(onAsk);

const permissionsDoc = (permissions: AgentPermissions | undefined): Doc | undefined => {
  if (permissions === undefined) {
    return undefined;
  }

  const onAsk = permissions["on-ask"];

  return map([...entry("on-ask", onAsk === undefined ? undefined : onAskDoc(onAsk))]);
};

/**
 * An agent task is one map inside a sequence: `agent` and the optional overrides, in the schema's
 * alphabetical order. It is a script item, not a step or a leaf of its own.
 */
const agentTaskDoc = (task: AgentTask): Doc =>
  map([
    { key: "agent", value: fromValue(task.agent) },
    ...entry("config", agentConfigDoc(task.config)),
    ...entry("permissions", permissionsDoc(task.permissions)),
    ...entry("prompt", task.prompt === undefined ? undefined : fromValue(task.prompt)),
    ...entry("provider", task.provider === undefined ? undefined : fromValue(task.provider)),
    ...entry(
      "use-legacy-mcp",
      task["use-legacy-mcp"] === undefined ? undefined : fromValue(task["use-legacy-mcp"]),
    ),
  ]);

/** One script element: a command, a pipe map or an agent-task map, in the author's order. */
const scriptItemDoc = (item: ScriptItem): Doc => {
  if (isPipe(item)) {
    return pipeDoc(item);
  }

  return isAgentTask(item) ? agentTaskDoc(item) : fromValue(item);
};

/** A script is always a sequence: commands, pipes and agent tasks share one list. */
export const scriptSeq = (script: readonly ScriptItem[]): Doc =>
  seq(script.map((item) => scriptItemDoc(item)));

/** An agent setup script is a sequence of commands and pipes only, never an agent task. */
const setupSeq = (setup: readonly AgentSetupItem[]): Doc =>
  seq(setup.map((item) => (isPipe(item) ? pipeDoc(item) : fromValue(item))));

/**
 * A reusable agent definition: `config`, `permissions`, `prompt`, `provider`, `setup-script` and
 * `use-legacy-mcp`, the schema's alphabetical order. The prompt is required, so it is never omitted.
 */
export const agentDefinitionDoc = (definition: AgentDefinition): Doc =>
  map([
    ...entry("config", agentConfigDoc(definition.config)),
    ...entry("permissions", permissionsDoc(definition.permissions)),
    { key: "prompt", value: fromValue(definition.prompt) },
    ...entry(
      "provider",
      definition.provider === undefined ? undefined : fromValue(definition.provider),
    ),
    ...entry(
      "setup-script",
      definition["setup-script"] === undefined ? undefined : setupSeq(definition["setup-script"]),
    ),
    ...entry(
      "use-legacy-mcp",
      definition["use-legacy-mcp"] === undefined
        ? undefined
        : fromValue(definition["use-legacy-mcp"]),
    ),
  ]);
