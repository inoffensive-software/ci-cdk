import { describe, expect, it } from "vitest";

import {
  DOC,
  entry,
  fromValue,
  map,
  present,
  scalar,
  type Doc,
  type LeafNode,
  type Text,
} from "./index.js";

const LEAF: LeafNode = { [DOC]: () => scalar("from a leaf", { style: "literal" }) };

interface OptionalNode {
  readonly if?: Doc;
}

interface OptionalField {
  readonly if?: Text;
}

/** Fields that were never set, which is what both helpers are written for. */
const ABSENT_NODE: OptionalNode = {};
const ABSENT_FIELD: OptionalField = {};

describe("entry", () => {
  it("emits nothing for an absent field", () => {
    expect(entry("if", ABSENT_NODE.if)).toStrictEqual([]);
  });

  it("wraps a node under its key", () => {
    const value = map([]);

    expect(entry("if", value)).toStrictEqual([{ key: "if", value }]);
  });
});

describe("present", () => {
  it("keeps an absent field absent", () => {
    expect(present(ABSENT_FIELD.if)).toBeUndefined();
  });

  it("lowers a scalar, a record and a sequence through the one boundary parser", () => {
    expect(present("1.5")).toStrictEqual(fromValue("1.5"));
    expect(present({ a: 1, b: true })).toStrictEqual(fromValue({ a: 1, b: true }));
    expect(present(["a", 2])).toStrictEqual(fromValue(["a", 2]));
  });

  it("renders a leaf as the node it builds", () => {
    expect(present(LEAF)).toStrictEqual(scalar("from a leaf", { style: "literal" }));
  });
});
