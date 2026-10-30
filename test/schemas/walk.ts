import { keyPath } from "../corpus/paths.js";

/**
 * A JSON schema document as data. Schemas are JSON, so a node is a scalar, a sequence or a map of
 * nodes, and the walk can read one without a second untyped boundary below the parse.
 */
export type SchemaNode =
  | string
  | number
  | boolean
  | null
  | readonly SchemaNode[]
  | { readonly [key: string]: SchemaNode };

type SchemaRecord = { readonly [key: string]: SchemaNode };

/**
 * Keywords whose branches all contribute keys, because a key one branch allows is allowed by the
 * node. `allOf` belongs here for the same reason: every conjunct's keys are legal together, and
 * leaving it unread would drop keys a schema states plainly.
 */
const UNION_KEYWORDS: readonly string[] = ["oneOf", "anyOf", "allOf"];

const isRecord = (node: SchemaNode): node is SchemaRecord =>
  typeof node === "object" && node !== null && !Array.isArray(node);

const isSequence = (node: SchemaNode): node is readonly SchemaNode[] => Array.isArray(node);

/**
 * A schema is parsed JSON text and nothing else, so the only check a boundary owes is that the tree
 * is made of JSON values. An object with a non-JSON member cannot reach the walk.
 */
const isSchemaNode = (value: unknown): value is SchemaNode => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isSchemaNode(item));
  }

  return typeof value === "object" && Object.values(value).every((member) => isSchemaNode(member));
};

/**
 * Parses schema text. This is the module's boundary: everything below reads `SchemaNode`, so a
 * provider never hands untyped data to the walk.
 */
export const schemaFromText = (text: string): SchemaNode => {
  const parsed: unknown = JSON.parse(text);

  if (!isSchemaNode(parsed)) {
    throw new Error("schema text is not a JSON document");
  }

  return parsed;
};

/** A JSON pointer segment escapes `/` as `~1` and `~` as `~0`, in that order to decode. */
const decodeSegment = (segment: string): string =>
  segment.replaceAll("~1", "/").replaceAll("~0", "~");

/**
 * Resolves a local pointer against the schema's own document, so `definitions` and `$defs` need no
 * special case. A remote reference is refused rather than fetched: the walk reads the pinned copy.
 */
const resolve = (root: SchemaNode, ref: string): SchemaNode => {
  if (ref === "#") {
    return root;
  }

  if (!ref.startsWith("#/")) {
    throw new Error(`schema reference ${JSON.stringify(ref)} is not a local pointer`);
  }

  let node = root;

  for (const raw of ref.slice(2).split("/")) {
    const record = isRecord(node) ? node : null;
    const next = record === null ? undefined : record[decodeSegment(raw)];

    if (next === undefined) {
      throw new Error(`schema reference ${JSON.stringify(ref)} does not resolve`);
    }

    node = next;
  }

  return node;
};

interface Walk {
  readonly root: SchemaNode;
  /** Paths whose children the author names, so a name there normalises to `*`. */
  readonly authorNamed: readonly string[];
  readonly paths: Set<string>;
}

/** The child of a named key, in the notation the exhaustiveness gate reads. */
const childPath = (walk: Walk, path: string, key: string): string =>
  walk.authorNamed.includes(path) ? `${path}.*` : keyPath(path, key);

const walkUnion = (walk: Walk, node: SchemaRecord, path: string, refs: readonly string[]): void => {
  for (const keyword of UNION_KEYWORDS) {
    const branches = node[keyword];

    if (branches === undefined) {
      continue;
    }

    if (!isSequence(branches)) {
      throw new Error(`${keyword} at ${path} is not an array`);
    }

    for (const branch of branches) {
      walkNode(walk, branch, path, refs);
    }
  }
};

const walkProperties = (
  walk: Walk,
  node: SchemaRecord,
  path: string,
  refs: readonly string[],
): void => {
  const properties = node["properties"];

  if (properties === undefined) {
    return;
  }

  if (!isRecord(properties)) {
    throw new Error(`properties at ${path} is not an object`);
  }

  for (const key of Object.keys(properties)) {
    const property = properties[key];

    if (property === undefined) {
      continue;
    }

    const child = childPath(walk, path, key);

    walk.paths.add(child);
    walkNode(walk, property, child, refs);
  }
};

/**
 * A tuple is refused, not skipped: a position the walk cannot describe would leave keys out of the
 * grammar and read as a smaller gap than the schema allows.
 */
const walkItems = (walk: Walk, node: SchemaRecord, path: string, refs: readonly string[]): void => {
  const prefixItems = node["prefixItems"];
  const items = node["items"];

  if (prefixItems !== undefined) {
    throw new Error(`tuple schema at ${path} gives prefixItems, which this walk cannot read`);
  }

  if (items === undefined) {
    return;
  }

  if (isSequence(items)) {
    throw new Error(`tuple schema at ${path} gives items as an array, which this walk cannot read`);
  }

  const itemPath = `${path}[]`;

  walk.paths.add(itemPath);
  walkNode(walk, items, itemPath, refs);
};

/** Pattern-keyed and open maps both yield one child named by the author, so they share `*`. */
const walkWildcard = (
  walk: Walk,
  schema: SchemaNode | undefined,
  path: string,
  refs: readonly string[],
): void => {
  // `false` closes the map, so nothing sits beside the keys the schema names.
  if (schema === undefined || schema === false) {
    return;
  }

  const wildcard = `${path}.*`;

  walk.paths.add(wildcard);

  if (schema !== true) {
    walkNode(walk, schema, wildcard, refs);
  }
};

const walkPatternProperties = (
  walk: Walk,
  node: SchemaRecord,
  path: string,
  refs: readonly string[],
): void => {
  const patterns = node["patternProperties"];

  if (patterns === undefined) {
    return;
  }

  if (!isRecord(patterns)) {
    throw new Error(`patternProperties at ${path} is not an object`);
  }

  for (const pattern of Object.keys(patterns)) {
    walkWildcard(walk, patterns[pattern], path, refs);
  }
};

const walkNode = (walk: Walk, node: SchemaNode, path: string, refs: readonly string[]): void => {
  if (!isRecord(node)) {
    return;
  }

  const ref = node["$ref"];

  if (ref !== undefined) {
    if (typeof ref !== "string") {
      throw new TypeError(`a $ref at ${path} is not a string`);
    }

    // A target already expanded on this path is the cycle: the keys below it repeat, so stop.
    if (refs.includes(ref)) {
      return;
    }

    walkNode(walk, resolve(walk.root, ref), path, [...refs, ref]);
  }

  // Draft-07 ignores keywords beside a `$ref`, but the vendored schema uses that position to add
  // keys the target lacks, so the node contributes both. Reading only the target would hide those
  // keys and understate the grammar.
  walkUnion(walk, node, path, refs);
  walkProperties(walk, node, path, refs);
  walkItems(walk, node, path, refs);
  walkPatternProperties(walk, node, path, refs);
  walkWildcard(walk, node["additionalProperties"], path, refs);
};

/**
 * Every key path a schema allows from its root, in the inventory's notation. The walk starts at the
 * root, so a definition nothing references contributes nothing. The caller supplies the paths whose
 * children the author names, so this stays provider-neutral.
 */
export const walkSchema = (
  schema: SchemaNode,
  authorNamed: readonly string[],
): readonly string[] => {
  const paths = new Set<string>();

  walkNode({ root: schema, authorNamed, paths }, schema, "$", []);

  return [...paths].toSorted();
};
