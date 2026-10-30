import { describe, expect, it } from "vitest";
import { parse, parseDocument } from "yaml";

import {
  DEFAULT_HEADER,
  DOC,
  DiagnosticError,
  block,
  fromValue,
  map,
  renderDoc,
  scalar,
  tagged,
  type Doc,
  type ScalarStyle,
  type Value,
} from "./index.js";

const emit = (value: Value, header = ""): string => renderDoc(fromValue(value), { header });

const styled = (value: string, style: ScalarStyle): string =>
  renderDoc(map([{ key: "value", value: scalar(value, { style }) }]), { header: "" });

const nestedMap: Value = {
  name: "build",
  on: "push",
  jobs: {
    build: {
      "runs-on": "ubuntu-latest",
      steps: [{ uses: "actions/checkout@v4" }, { run: "npm test" }],
    },
  },
};

describe("emission", () => {
  describe("goldens", () => {
    it("pins a nested map", async () => {
      await expect(renderDoc(fromValue(nestedMap))).toMatchFileSnapshot(
        "__snapshots__/map-trap.txt",
      );
    });

    it("pins nested sequences", async () => {
      const value: Value = {
        matrix: { os: ["ubuntu-latest", "macos-latest"] },
        nested: [[1, 2], [3]],
      };

      await expect(renderDoc(fromValue(value))).toMatchFileSnapshot(
        "__snapshots__/sequence-nested.txt",
      );
    });

    it("pins the empty document", async () => {
      await expect(renderDoc(fromValue({}))).toMatchFileSnapshot(
        "__snapshots__/empty-document.txt",
      );
    });

    it("pins the number traps", async () => {
      const value: Value = { "1.10": "1.10", number: 1.1, exponent: 1e21, integer: 10 };

      await expect(renderDoc(fromValue(value))).toMatchFileSnapshot(
        "__snapshots__/number-trap.txt",
      );
    });

    describe("quoting traps", () => {
      it("pins the on key", async () => {
        await expect(renderDoc(fromValue({ on: "push" }))).toMatchFileSnapshot(
          "__snapshots__/on-key-trap.txt",
        );
      });

      it("pins the YAML 1.1 booleans", async () => {
        const value: Value = { a: "yes", b: "no", c: "on", d: "off", e: true, f: false };

        await expect(renderDoc(fromValue(value))).toMatchFileSnapshot(
          "__snapshots__/boolean-trap.txt",
        );
      });

      it("pins the null text next to a null", async () => {
        await expect(renderDoc(fromValue({ a: "null", b: null }))).toMatchFileSnapshot(
          "__snapshots__/null-trap.txt",
        );
      });

      it("pins a value containing a mapping indicator", async () => {
        await expect(renderDoc(fromValue({ a: "key: value" }))).toMatchFileSnapshot(
          "__snapshots__/colon-trap.txt",
        );
      });

      it("pins a value containing a comment indicator", async () => {
        await expect(renderDoc(fromValue({ a: "value # comment" }))).toMatchFileSnapshot(
          "__snapshots__/comment-trap.txt",
        );
      });

      it("pins a long plain string", async () => {
        await expect(renderDoc(fromValue({ a: "x".repeat(140) }))).toMatchFileSnapshot(
          "__snapshots__/long-line-trap.txt",
        );
      });

      it("pins text that already carries quotes", async () => {
        await expect(renderDoc(fromValue({ a: '"quoted"', b: "'single'" }))).toMatchFileSnapshot(
          "__snapshots__/pre-quoted-trap.txt",
        );
      });
    });

    it("pins shell text as a literal block", async () => {
      const doc = map([{ key: "run", value: block("echo hi\n\nnpm test\n") }]);

      await expect(renderDoc(doc)).toMatchFileSnapshot("__snapshots__/block-script.txt");
    });

    describe("styles and tags", () => {
      it("pins a literal block with no trailing newline", async () => {
        const doc = map([{ key: "run", value: block("echo hi\nnpm test") }]);

        await expect(renderDoc(doc)).toMatchFileSnapshot(
          "__snapshots__/block-no-trailing-newline.txt",
        );
      });

      it("pins a literal block with trailing newlines", async () => {
        const doc = map([{ key: "run", value: block("echo hi\n\n\n") }]);

        await expect(renderDoc(doc)).toMatchFileSnapshot(
          "__snapshots__/block-trailing-newlines.txt",
        );
      });

      it("pins folded text", async () => {
        const doc = map([
          { key: "note", value: scalar("one folded sentence", { style: "folded" }) },
        ]);

        await expect(renderDoc(doc)).toMatchFileSnapshot("__snapshots__/folded-text.txt");
      });

      it("pins a tagged scalar", async () => {
        const doc = map([{ key: "ref", value: tagged("!reference", scalar("*.default")) }]);

        await expect(renderDoc(doc)).toMatchFileSnapshot("__snapshots__/tagged-scalar.txt");
      });
    });

    it("pins a document with no header", async () => {
      await expect(emit(nestedMap, "")).toMatchFileSnapshot("__snapshots__/header-off.txt");
    });
  });

  describe("order", () => {
    it("keeps key order at every depth", () => {
      const value: Value = { z: 1, a: { m: 1, b: 2 }, y: 3 };

      expect(emit(value)).toBe("z: 1\na:\n  m: 1\n  b: 2\ny: 3\n");
    });

    it("keeps array order", () => {
      expect(emit(["c", "a", "b"])).toBe("- c\n- a\n- b\n");
    });

    it("ignores symbol keys", () => {
      const marker = Symbol("marker");
      const value = { a: 1, [marker]: "ignored" };

      expect(renderDoc(fromValue(value), { header: "" })).toBe("a: 1\n");
    });

    it("rejects duplicate keys in one map", () => {
      const doc = map([
        { key: "runs-on", value: scalar("a") },
        { key: "runs-on", value: scalar("b") },
      ]);

      expect(() => renderDoc(doc, { header: "" })).toThrow(DiagnosticError);
      expect(() => renderDoc(doc, { header: "" })).toThrow(/duplicate key/u);
      expect(() => renderDoc(doc, { header: "" })).toThrow(/\$\["runs-on"\]/u);
    });
  });

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

    it("cannot tell a canonically numeric string from a number", () => {
      // Numbers are the one type still carried as text: `fromValue` serialises them with `String(n)`,
      // so a canonical spelling is already a number by the time the serializer sees it.
      expect(emit({ a: "42" })).toBe("a: 42\n");
      expect(emit({ a: "1.5" })).toBe("a: 1.5\n");
    });

    it("quotes the string null but keeps a null a null", () => {
      expect(emit({ a: "null", b: null })).toBe('a: "null"\nb: null\n');
    });

    it("quotes a string that looks like a boolean but keeps booleans", () => {
      expect(emit({ a: "true", b: "false", c: true, d: false })).toBe(
        'a: "true"\nb: "false"\nc: true\nd: false\n',
      );
    });

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

    it("does not wrap a long plain string", () => {
      const long = "x".repeat(140);

      expect(emit({ a: long })).toBe(`a: ${long}\n`);
    });
  });

  describe("styles", () => {
    it("honours every style the text allows", () => {
      expect(styled("plain text", "plain")).toBe("value: plain text\n");
      expect(styled("it's fine", "single")).toBe("value: 'it''s fine'\n");
      expect(styled('say "hi"', "double")).toBe('value: "say \\"hi\\""\n');
      expect(styled("echo hi\nnpm test\n", "literal")).toBe("value: |\n  echo hi\n  npm test\n");
      expect(styled("one folded sentence", "folded")).toBe("value: >-\n  one folded sentence\n");
    });

    it("keeps the style it was given when the text would also be plain", () => {
      expect(styled("plain text", "literal")).toBe("value: |-\n  plain text\n");
      expect(styled("plain text", "double")).toBe('value: "plain text"\n');
      expect(renderDoc(map([{ key: "run", value: block("npm test") }]), { header: "" })).toBe(
        "run: |-\n  npm test\n",
      );
    });

    it("emits a literal block with its newlines intact", () => {
      expect(styled("line1\n\nline2\n", "literal")).toBe("value: |\n  line1\n\n  line2\n");
    });

    it("keeps trailing spaces inside a literal block", () => {
      expect(styled("echo 'a'   \necho b\n", "literal")).toBe(
        "value: |\n  echo 'a'   \n  echo b\n",
      );
    });

    it("keeps trailing blank lines inside a literal block", () => {
      expect(styled("a\n\n\n", "literal")).toBe("value: |+\n  a\n\n\n");
    });

    // The goldens pin the style; these tests pin the text each style carries.
    it("reads literal block text back byte for byte", () => {
      const text = "echo hi\n\nnpm test\n";

      expect(
        parse(renderDoc(map([{ key: "run", value: block(text) }]), { header: "" })),
      ).toStrictEqual({ run: text });
    });

    it("reads a literal block with no trailing newline back without adding one", () => {
      const text = "echo hi\nnpm test";

      expect(
        parse(renderDoc(map([{ key: "run", value: block(text) }]), { header: "" })),
      ).toStrictEqual({ run: text });
    });

    it("reads a literal block with trailing newlines back with all of them", () => {
      const text = "echo hi\n\n\n";

      expect(
        parse(renderDoc(map([{ key: "run", value: block(text) }]), { header: "" })),
      ).toStrictEqual({ run: text });
    });

    it("reads folded text back as the text it was given", () => {
      const text = "one folded sentence";

      expect(parse(styled(text, "folded"))).toStrictEqual({ value: text });
    });

    it("keeps a folded newline as content rather than folding it away", () => {
      const text = "line one\nline two";

      expect(parse(styled(text, "folded"))).toStrictEqual({ value: text });
    });

    it("reads a tagged scalar back to the same value", () => {
      const doc = parseDocument(
        renderDoc(map([{ key: "ref", value: tagged("!reference", scalar("*.default")) }]), {
          header: "",
        }),
      );

      expect(doc.errors).toStrictEqual([]);
      expect(doc.toJS()).toStrictEqual({ ref: "*.default" });
    });

    it("emits single-quoted text", () => {
      expect(styled("it's fine", "single")).toBe("value: 'it''s fine'\n");
    });

    it("emits double-quoted text", () => {
      expect(styled('say "hi"', "double")).toBe('value: "say \\"hi\\""\n');
    });

    it("keeps a tag on a scalar", () => {
      const doc = map([{ key: "ref", value: tagged("!reference", scalar("*.default")) }]);

      expect(renderDoc(doc, { header: "" })).toBe('ref: !reference "*.default"\n');
    });

    it("rejects a tag that would inject structure", () => {
      const doc = map([{ key: "a", value: tagged("!t\nfoo: bar", scalar("1")) }]);

      expect(() => renderDoc(doc, { header: "" })).toThrow(DiagnosticError);
      expect(() => renderDoc(doc, { header: "" })).toThrow(/\$\.a/u);
    });

    it("rejects a tag containing a comment indicator or flow punctuation", () => {
      const withSpace = map([{ key: "a", value: tagged("!t # x", scalar("1")) }]);
      const withBracket = map([{ key: "a", value: tagged("!t[x]", scalar("1")) }]);

      expect(() => renderDoc(withSpace, { header: "" })).toThrow(/not a valid YAML tag/u);
      expect(() => renderDoc(withBracket, { header: "" })).toThrow(/not a valid YAML tag/u);
    });

    it("rejects a tag the YAML parser would fail on", () => {
      const tags = ['!t"x', "!t|x", "!t>x", "!t%zz", "!t`x", "!t\\x", "!café"];

      for (const tag of tags) {
        const doc = map([{ key: "a", value: tagged(tag, scalar("1")) }]);

        expect(() => renderDoc(doc, { header: "" })).toThrow(/not a valid YAML tag/u);
      }
    });

    it("rejects a named tag handle", () => {
      const doc = map([{ key: "a", value: tagged("!e!tag", scalar("1")) }]);

      expect(() => renderDoc(doc, { header: "" })).toThrow(/not a valid YAML tag/u);
    });

    it("accepts a secondary tag", () => {
      const doc = map([{ key: "a", value: tagged("!!str", scalar("1")) }]);

      expect(renderDoc(doc, { header: "" })).toBe("a: !!str 1\n");
    });

    it("does not repeat a type marker the emitted value already implies", () => {
      const doc = map([{ key: "a", value: tagged("!!null", scalar("null")) }]);

      expect(renderDoc(doc, { header: "" })).toBe("a: null\n");
    });

    it("only emits tags its own parser accepts", () => {
      const tags = ["!reference", "!!str", "!foo-bar", "!foo%20bar", "!tag"];

      for (const tag of tags) {
        const doc = map([{ key: "a", value: tagged(tag, scalar("1")) }]);
        const parsed = parseDocument(renderDoc(doc, { header: "" }));

        expect(parsed.errors).toStrictEqual([]);
      }
    });

    it("emits single-quoted text containing a newline as double-quoted", () => {
      expect(styled("one\ntwo", "single")).toBe('value: "one\\ntwo"\n');
    });
  });

  describe("empty collections", () => {
    it("emits an empty map as {}", () => {
      expect(emit({ a: {} })).toBe("a: {}\n");
    });

    it("emits an empty sequence as []", () => {
      expect(emit({ a: [] })).toBe("a: []\n");
    });

    it("emits an empty root sequence", () => {
      expect(emit([])).toBe("[]\n");
    });

    it("ends a document with no entries with one newline", () => {
      expect(emit({})).toBe("{}\n");
    });
  });

  describe("header", () => {
    it("writes the default header with no blank line after it", () => {
      expect(renderDoc(fromValue({ a: 1 }))).toBe(`# ${DEFAULT_HEADER}\na: 1\n`);
    });

    it("omits the header when it is empty", () => {
      expect(renderDoc(fromValue({ a: 1 }), { header: "" })).toBe("a: 1\n");
    });

    it("rejects a multi-line header", () => {
      expect(() => renderDoc(fromValue({ a: 1 }), { header: "one\ntwo" })).toThrow(DiagnosticError);
    });
  });

  describe("scalars", () => {
    it("emits null, booleans, integers and floats", () => {
      expect(emit({ n: null, t: true, f: false, i: 42, d: 1.5 })).toBe(
        "n: null\nt: true\nf: false\ni: 42\nd: 1.5\n",
      );
    });

    it("emits a document whose root is null", () => {
      expect(emit(null)).toBe("null\n");
    });

    it("quotes a string containing a newline rather than folding it into a block", () => {
      const text = "line1\nline2";
      const out = emit({ a: text });

      // `fromValue` lowers plain data as plain: the emitter quotes the newline instead of choosing a
      // block, and the exact bytes prove no block header was written.
      expect(out).toBe('a: "line1\\nline2"\n');
      expect(parse(out)).toStrictEqual({ a: text });
    });

    it("lowers a DOC-carrying leaf and keeps the style it chose", () => {
      const leaf = { [DOC]: (): Doc => scalar("${{ secrets.TOKEN }}", { style: "double" }) };

      expect(renderDoc(fromValue({ token: leaf }), { header: "" })).toBe(
        'token: "${{ secrets.TOKEN }}"\n',
      );
    });
  });

  describe("newlines", () => {
    it("emits LF only and exactly one trailing newline", () => {
      const text = emit({ a: [1, 2], b: "c" });

      expect(text.endsWith("\n")).toBe(true);
      expect(text.endsWith("\n\n")).toBe(false);
      expect(text.includes("\r")).toBe(false);
      expect(text.split("\n")).toHaveLength(5);
    });
  });
});
