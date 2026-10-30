import { describe, expect, it } from "vitest";

import { duplicatesBy } from "./index.js";

describe("duplicatesBy", () => {
  it("keeps only the keys claimed more than once", () => {
    expect(duplicatesBy(["a", "b", "a"], (value) => value)).toStrictEqual(new Map([["a", [0, 2]]]));
  });

  it("returns nothing when every key is unique", () => {
    expect(duplicatesBy(["a", "b"], (value) => value)).toStrictEqual(new Map());
  });

  it("lists every position of a key claimed three times", () => {
    const items = [{ id: "x" }, { id: "y" }, { id: "x" }, { id: "x" }];

    expect(duplicatesBy(items, (item) => item.id)).toStrictEqual(new Map([["x", [0, 2, 3]]]));
  });

  it("orders keys by their first claim", () => {
    const keys = [...duplicatesBy(["b", "a", "b", "a"], (value) => value).keys()];

    expect(keys).toStrictEqual(["b", "a"]);
  });

  it("covers the empty list", () => {
    expect(duplicatesBy([], (value: string) => value)).toStrictEqual(new Map());
  });
});
