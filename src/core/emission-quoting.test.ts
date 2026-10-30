import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Value, fromValue, renderDoc } from "./index.js";

const emit = (value: Value, header = ""): string => renderDoc(fromValue(value), { header });

describe("quoting", () => {
  it("leaves `on` unquoted", () => {
    expect(emit({ on: "push" })).toBe("on: push\n");
  });

  it("quotes the YAML 1.1 booleans", () => {
    expect(emit({ a: "yes", b: "no", c: "on", d: "off", e: "y", f: "n" })).toBe(
      'a: "yes"\nb: "no"\nc: "on"\nd: "off"\ne: "y"\nf: "n"\n',
    );
  });

  it("quotes non-canonical number-like strings but not numbers", () => {
    expect(emit({ a: "1.10", b: 1.1, c: "42.0", d: 42 })).toBe(
      'a: "1.10"\nb: 1.1\nc: "42.0"\nd: 42\n',
    );
  });

  it("keeps a canonically numeric string a string", () => {
    // `fromValue` tags a string whose text is a canonical number, so the serializer can tell it from
    // the number literal that spells the same text.
    expect(emit({ a: "42" })).toBe('a: "42"\n');
    expect(emit({ a: "1.5" })).toBe('a: "1.5"\n');
  });

  it("still emits a number as a number", () => {
    expect(emit({ a: 42, b: 1.5 })).toBe("a: 42\nb: 1.5\n");
  });

  it("quotes the string null but keeps a null a null", () => {
    expect(emit({ a: "null", b: null })).toBe('a: "null"\nb: null\n');
  });

  it("quotes a string that looks like a boolean but keeps booleans", () => {
    expect(emit({ a: "true", b: "false", c: true, d: false })).toBe(
      'a: "true"\nb: "false"\nc: true\nd: false\n',
    );
  });
});

describe("round trips", () => {
  it("quotes strings containing a mapping or comment indicator", () => {
    expect(emit({ a: "key: value", b: "value # comment" })).toBe(
      'a: "key: value"\nb: "value # comment"\n',
    );
  });

  it("reads the punctuation traps back as the text that was written", () => {
    const value: Value = { a: "key: value", b: "value # comment" };

    expect(parse(emit(value))).toStrictEqual(value);
  });

  it("reads the null and boolean traps back as the values that were written", () => {
    const value: Value = { a: "null", b: null, c: "true", d: true };

    expect(parse(emit(value))).toStrictEqual(value);
  });

  it("leaves text that already carries quotes alone", () => {
    const value: Value = { a: '"quoted"', b: "'single'" };

    expect(parse(emit(value))).toStrictEqual(value);
  });

  it("keeps a long multi-line string on one escaped physical line", () => {
    const value: Value = {
      a: "if [ -f pnpm-lock.yaml ]; then\n  pnpm install --frozen-lockfile\nfi",
    };

    const text = emit(value);

    // A folded double-quoted scalar would spread this over several physical lines with a blank line
    // between them, which the format contract forbids.
    expect(text.split("\n")).toHaveLength(2);
    expect(parse(text)).toStrictEqual(value);
  });

  it("does not wrap a long plain string", () => {
    const long = "x".repeat(140);

    expect(emit({ a: long })).toBe(`a: ${long}\n`);
  });
});
