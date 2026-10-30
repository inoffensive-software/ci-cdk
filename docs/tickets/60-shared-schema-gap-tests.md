# 60: One schema-gap test scaffold

**Spec:** none (refactor found by the sharing sweep)

**What to build:** The assertions every provider runs over its documented-grammar gate live in one
helper, the way `describeCoverageDebt` already does for the raw ledger. Three near-identical test files
become three calls.

**Blocked by:** 59 (One corpus gate rule-set), because both rewrite the same corpus-test tree.

**Status:** done

- [x] A shared helper asserts, for a provider's schema paths, modelled paths, gaps and overclaims: every
      schema path is modelled or declared, no gap is orphaned, no gap is stale, every undeclared
      overclaim is reported, no overclaim row is unused, rows are sorted and de-duplicated, categories
      are closed, and every row carries a reason.
- [x] The three `schema-gap.test.ts` files call it with their own four values and add only the
      provider-specific negative cases on top.
- [x] The assertion set is the union of what the three files assert today, so GitHub Actions gains the
      stale-row check it is currently missing rather than losing anything.
- [x] Failure messages name the offending path, so a red test is still diagnosable.
- [x] `pnpm check` passes.
