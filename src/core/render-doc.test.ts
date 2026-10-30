import { describe, expect, it } from "vitest";

import { DiagnosticError } from "./errors.js";
import { normalise } from "./render-doc.js";

/**
 * White-box by necessity: the guards exist to catch a bypassed pinned option, so no `Doc` the public
 * barrel can produce reaches them. They are asserted directly rather than left to review.
 */
describe("format guard", () => {
  it("rejects a blank line outside a block scalar", () => {
    expect(() => normalise("a: 1\n\nb: 2\n")).toThrow(DiagnosticError);
    expect(() => normalise("a: 1\n\nb: 2\n")).toThrow(/blank line/u);
  });

  it("rejects a document marker", () => {
    expect(() => normalise("---\na: 1\n")).toThrow(/document marker/u);
  });

  it("keeps a blank line that is block scalar content", () => {
    expect(normalise("run: |\n  a\n\n  b\n")).toBe("run: |\n  a\n\n  b\n");
  });
});
