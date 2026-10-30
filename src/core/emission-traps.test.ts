import { describe, expect, it } from "vitest";

import { type Value, block, fromValue, map, renderDoc, scalar, tagged } from "./index.js";

describe("quoting traps", () => {
  it("pins the on key", async () => {
    await expect(renderDoc(fromValue({ on: "push" }))).toMatchFileSnapshot(
      "__snapshots__/on-key-trap.txt",
    );
  });

  it("pins the YAML 1.1 booleans", async () => {
    const value: Value = { a: "yes", b: "no", c: "on", d: "off", e: true, f: false };

    await expect(renderDoc(fromValue(value))).toMatchFileSnapshot("__snapshots__/boolean-trap.txt");
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

describe("block goldens", () => {
  it("pins shell text as a literal block", async () => {
    const doc = map([{ key: "run", value: block("echo hi\n\nnpm test\n") }]);

    await expect(renderDoc(doc)).toMatchFileSnapshot("__snapshots__/block-script.txt");
  });
});

describe("styles and tags", () => {
  it("pins a literal block with no trailing newline", async () => {
    const doc = map([{ key: "run", value: block("echo hi\nnpm test") }]);

    await expect(renderDoc(doc)).toMatchFileSnapshot("__snapshots__/block-no-trailing-newline.txt");
  });

  it("pins a literal block with trailing newlines", async () => {
    const doc = map([{ key: "run", value: block("echo hi\n\n\n") }]);

    await expect(renderDoc(doc)).toMatchFileSnapshot("__snapshots__/block-trailing-newlines.txt");
  });

  it("pins folded text", async () => {
    const doc = map([{ key: "note", value: scalar("one folded sentence", { style: "folded" }) }]);

    await expect(renderDoc(doc)).toMatchFileSnapshot("__snapshots__/folded-text.txt");
  });

  it("pins a tagged scalar", async () => {
    const doc = map([{ key: "ref", value: tagged("!reference", scalar("*.default")) }]);

    await expect(renderDoc(doc)).toMatchFileSnapshot("__snapshots__/tagged-scalar.txt");
  });
});
