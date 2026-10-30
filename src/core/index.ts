export { DOC, block, map, scalar, seq, tagged } from "./doc.js";

export type {
  Doc,
  DocEntry,
  DocMap,
  DocScalar,
  DocSeq,
  LeafNode,
  Scalar,
  ScalarOptions,
  ScalarStyle,
  Text,
} from "./doc.js";

export { duplicatesBy } from "./duplicates.js";

export { DiagnosticError, fail, formatDiagnostics } from "./errors.js";

export type { Diagnostic } from "./errors.js";

export { entry, present } from "./fields.js";

export { fromValue } from "./from-value.js";

export { DEFAULT_HEADER, renderDoc } from "./render-doc.js";

export type { RenderOptions } from "./render-doc.js";

export type { Serializer } from "./serialize.js";

export type { Value } from "./value.js";
