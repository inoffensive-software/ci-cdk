import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/github-actions/index.js";
import { ENTRIES } from "./entries.js";
import { readVendored } from "../vendored.js";

describe("corpus", () => {
  it.each(ENTRIES)(
    "$name reproduces the pinned config's data, header suppressed",
    async (entry) => {
      const upstream = parse(await readVendored(import.meta.dirname, entry.file));

      expect(parse(render(entry.workflow, { header: "" }))).toStrictEqual(upstream);
    },
  );
});
