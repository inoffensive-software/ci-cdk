import { DOC, entry, fromValue, map, present, type Doc, type LeafNode } from "../core/index.js";
import type {
  ExistsOptions,
  RuleExists,
  Variable,
  VariableOptions,
  Variables,
} from "./nesting-types.js";

/** A leaf decides its own style; a variable's map form is the provider's own shape. */
const isLeaf = <T extends object>(value: LeafNode | T): value is LeafNode =>
  Object.hasOwn(value, DOC);

/** The map form of a variable, in GitLab's documented key order; `value` is required. */
const variableOptionsDoc = (variable: VariableOptions): Doc =>
  map([
    { key: "value", value: fromValue(variable.value) },
    ...entry("expand", present(variable.expand)),
    ...entry("options", present(variable.options)),
    ...entry("description", present(variable.description)),
  ]);

/** A variable keeps its bare scalar shape; only the map form lowers key by key. */
const variableDoc = (variable: Variable): Doc =>
  typeof variable === "object" && !isLeaf(variable)
    ? variableOptionsDoc(variable)
    : fromValue(variable);

/**
 * An author-named variable map. Lowering each value keeps insertion order and lets the boundary
 * parser carry a numeric-looking string as a string (ADR 0010).
 */
export const variablesDoc = (value: Variables): Doc =>
  map(Object.entries(value).map(([key, variable]) => ({ key, value: variableDoc(variable) })));

const isExistsMap = (exists: RuleExists): exists is ExistsOptions => !Array.isArray(exists);

/** A rule's `exists` keeps the bare path list; the map form is paths, project, ref, regexp. */
export const existsDoc = (exists: RuleExists): Doc =>
  isExistsMap(exists)
    ? map([
        ...entry("paths", present(exists.paths)),
        ...entry("project", present(exists.project)),
        ...entry("ref", present(exists.ref)),
        ...entry("regexp", present(exists.regexp)),
      ])
    : fromValue(exists);
