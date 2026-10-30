import { DOC, block, scalar, type Doc, type LeafNode } from "../core/index.js";

/** A leaf owns its own style; nothing downstream infers one from the text. */
const expression = (text: string): LeafNode => ({
  [DOC]: (): Doc => scalar(`\${{ ${text} }}`, { style: "double" }),
  toString: (): string => `\${{ ${text} }}`,
});

const interpolate = (
  strings: TemplateStringsArray,
  values: readonly (string | number)[],
): string => {
  let text = strings[0] ?? "";

  // Every value sits between two literals, so the literal after it is at `index + 1`. Reading the
  // values rather than the strings means a value is never silently dropped.
  for (const [index, value] of values.entries()) {
    text += String(value) + (strings[index + 1] ?? "");
  }

  return text;
};

/** A GitHub expression: always double-quoted, so `: `, ` #` and braces stay YAML text. */
export const expr = (
  strings: TemplateStringsArray,
  ...values: readonly (string | number)[]
): LeafNode => expression(interpolate(strings, values));

/** Shell text, emitted as a literal block so newlines and relative indentation survive. */
export const script = (text: string): LeafNode => ({
  [DOC]: (): Doc => block(text),
  toString: (): string => text,
});

/** Same node shape as `expr`, for the two paths that are most often written wrong. */
export const matrix = (key: string): LeafNode => expression(`matrix.${key}`);

export const needs = (id: string, output: string): LeafNode =>
  expression(`needs.${id}.outputs.${output}`);
