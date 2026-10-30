import { describe, expect, it } from "vitest";

/** The shape a ledger row must have; each provider's `coverage-debt.ts` is structurally identical. */
interface CoverageRow {
  readonly path: string;
  readonly reason: string;
}

interface CoverageOptions<Fixture> {
  /** The fixtures whose raw usage the ledger must describe exactly. */
  readonly fixtures: readonly Fixture[];
  /** The provider's own walk: only the caller knows where its definition keeps `raw`. */
  readonly rawPathsOf: (fixture: Fixture) => readonly string[];
  readonly debt: readonly CoverageRow[];
}

/**
 * Asserts the provider's coverage ledger against its fixtures, in both directions. The walker stays
 * with the provider because the structures differ; only the assertions are shared.
 */
export const describeCoverageDebt = <Fixture>({
  fixtures,
  rawPathsOf,
  debt,
}: CoverageOptions<Fixture>): void => {
  describe("coverage debt", () => {
    it("declares exactly the raw paths the fixtures use, in both directions", () => {
      const declared = debt.map((row) => row.path).toSorted();
      const used = fixtures.flatMap(rawPathsOf).toSorted();

      expect(declared).toStrictEqual(used);
    });

    it("gives every declared path a reason", () => {
      expect(debt.every((row) => row.reason.trim() !== "")).toBe(true);
    });

    it("scans the fixtures", () => {
      expect(fixtures).not.toHaveLength(0);
    });
  });
};
