import type { Text } from "../core/index.js";

/** A pipe call inside a script sequence: an id plus optional variables, never a leaf. */
export interface Pipe {
  readonly pipe: Text;
  readonly variables?: Readonly<Record<string, Text | readonly Text[]>>;
}
