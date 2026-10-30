/** A parsed YAML document, concrete all the way down so the walk needs no untyped parameter. */
export type YamlNode =
  | string
  | number
  | boolean
  | null
  | readonly YamlNode[]
  | { readonly [key: string]: YamlNode };

const isRecord = (value: YamlNode): value is { readonly [key: string]: YamlNode } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

/** The diagnostic notation, so a key path reads as the path an author would be given. */
export const keyPath = (path: string, key: string): string =>
  IDENTIFIER.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;

const walk = (
  node: YamlNode,
  path: string,
  paths: Set<string>,
  authorNamed: readonly string[],
): void => {
  if (Array.isArray(node)) {
    const itemPath = `${path}[]`;

    paths.add(itemPath);

    for (const item of node) {
      walk(item, itemPath, paths, authorNamed);
    }

    return;
  }

  if (!isRecord(node)) {
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    const childPath = authorNamed.includes(path) ? `${path}.*` : keyPath(path, key);

    paths.add(childPath);
    walk(value, childPath, paths, authorNamed);
  }
};

/**
 * Every key path in a parsed document, with sequence positions and author-chosen names normalised.
 * The caller supplies the paths whose children the author names, so this stays provider-neutral.
 */
export const walkPaths = (
  document: YamlNode,
  authorNamed: readonly string[],
): readonly string[] => {
  const paths = new Set<string>();

  walk(document, "$", paths, authorNamed);

  return [...paths].toSorted();
};
