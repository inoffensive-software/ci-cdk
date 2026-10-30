import { describe, expect, it } from "vitest";
import { parse, parseDocument } from "yaml";

import {
  DiagnosticError,
  block,
  map,
  renderDoc,
  scalar,
  tagged,
  type ScalarStyle,
} from "./index.js";

const styled = (value: string, style: ScalarStyle): string =>
  renderDoc(map([{ key: "value", value: scalar(value, { style }) }]), { header: "" });

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

  it("emits single-quoted text", () => {
    expect(styled("it's fine", "single")).toBe("value: 'it''s fine'\n");
  });

  it("emits double-quoted text", () => {
    expect(styled('say "hi"', "double")).toBe('value: "say \\"hi\\""\n');
  });

  it("emits single-quoted text containing a newline as double-quoted", () => {
    expect(styled("one\ntwo", "single")).toBe('value: "one\\ntwo"\n');
  });
});

describe("literal blocks", () => {
  it("emits a literal block with its newlines intact", () => {
    expect(styled("line1\n\nline2\n", "literal")).toBe("value: |\n  line1\n\n  line2\n");
  });

  it("keeps trailing spaces inside a literal block", () => {
    expect(styled("echo 'a'   \necho b\n", "literal")).toBe("value: |\n  echo 'a'   \n  echo b\n");
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
});

describe("folded text", () => {
  it("reads folded text back as the text it was given", () => {
    const text = "one folded sentence";

    expect(parse(styled(text, "folded"))).toStrictEqual({ value: text });
  });

  it("keeps a folded newline as content rather than folding it away", () => {
    const text = "line one\nline two";

    expect(parse(styled(text, "folded"))).toStrictEqual({ value: text });
  });
});

describe("tags", () => {
  it("reads a tagged scalar back to the same value", () => {
    const doc = parseDocument(
      renderDoc(map([{ key: "ref", value: tagged("!reference", scalar("*.default")) }]), {
        header: "",
      }),
    );

    expect(doc.errors).toStrictEqual([]);
    expect(doc.toJS()).toStrictEqual({ ref: "*.default" });
  });

  it("keeps a tag on a scalar", () => {
    const doc = map([{ key: "ref", value: tagged("!reference", scalar("*.default")) }]);

    expect(renderDoc(doc, { header: "" })).toBe('ref: !reference "*.default"\n');
  });
});

describe("tag validation", () => {
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
    const doc = map([{ key: "a", value: tagged("!reference", scalar("1")) }]);

    expect(renderDoc(doc, { header: "" })).toBe("a: !reference 1\n");
  });
});

describe("type markers", () => {
  it("does not repeat a type marker the emitted value already implies", () => {
    const doc = map([{ key: "a", value: tagged("!!null", scalar("null")) }]);

    expect(renderDoc(doc, { header: "" })).toBe("a: null\n");
  });

  it("resolves the string marker to a quoted scalar without emitting it", () => {
    const doc = map([{ key: "a", value: tagged("!!str", scalar("1")) }]);

    expect(renderDoc(doc, { header: "" })).toBe('a: "1"\n');
  });

  it("only emits tags its own parser accepts", () => {
    const tags = ["!reference", "!!str", "!foo-bar", "!foo%20bar", "!tag"];

    for (const tag of tags) {
      const doc = map([{ key: "a", value: tagged(tag, scalar("1")) }]);
      const parsed = parseDocument(renderDoc(doc, { header: "" }));

      expect(parsed.errors).toStrictEqual([]);
    }
  });
});
