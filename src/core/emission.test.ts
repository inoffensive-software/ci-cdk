import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  DEFAULT_HEADER,
  DOC,
  DiagnosticError,
  fromValue,
  map,
  renderDoc,
  scalar,
  type Doc,
  type Value,
} from "./index.js";

const emit = (value: Value, header = ""): string => renderDoc(fromValue(value), { header });

const NESTED_MAP: Value = {
  name: "build",
  on: "push",
  jobs: {
    build: {
      "runs-on": "ubuntu-latest",
      steps: [{ uses: "actions/checkout@v4" }, { run: "npm test" }],
    },
  },
};

describe("goldens", () => {
  it("pins a nested map", async () => {
    await expect(renderDoc(fromValue(NESTED_MAP))).toMatchFileSnapshot(
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
    await expect(renderDoc(fromValue({}))).toMatchFileSnapshot("__snapshots__/empty-document.txt");
  });

  it("pins the number traps", async () => {
    const value: Value = { "1.10": "1.10", number: 1.1, exponent: 1e21, integer: 10 };

    await expect(renderDoc(fromValue(value))).toMatchFileSnapshot("__snapshots__/number-trap.txt");
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

  it("pins a document with no header", async () => {
    await expect(emit(NESTED_MAP, "")).toMatchFileSnapshot("__snapshots__/header-off.txt");
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

describe("structure", () => {
  it("pins a deeply nested document", async () => {
    const value: Value = {
      level1: {
        level2: {
          level3: [
            { name: "leaf", args: ["one", "two"] },
            { name: "other", args: [] },
          ],
        },
      },
    };

    await expect(renderDoc(fromValue(value))).toMatchFileSnapshot(
      "__snapshots__/deeply-nested.txt",
    );
  });
});
