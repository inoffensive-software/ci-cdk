import type { Doc, DocEntry, Scalar, Text } from "./doc.js";
import { fromValue } from "./from-value.js";
import type { Value } from "./value.js";

/**
 * Everything a modelled field can hold without building a `Doc` by hand: one scalar, any plain data,
 * an author-named map whose values are scalars, or a list of text. The list is separate because a
 * leaf decides its own style and `Value` cannot name one.
 */
type Presentable = Scalar | Value | readonly Text[] | Readonly<Record<string, Scalar>>;

/** Only a declared field with a value is emitted; absent fields are not lowered at all. */
export const entry = (key: string, value: Doc | undefined): readonly DocEntry[] =>
  value === undefined ? [] : [{ key, value }];

/** Absent stays absent; anything present crosses the one boundary parser. */
export const present = (value: Presentable | undefined): Doc | undefined =>
  value === undefined ? undefined : fromValue(value);
