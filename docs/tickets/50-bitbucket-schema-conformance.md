# 50: Bitbucket schema conformance

**Spec:** `docs/specs/0007-bitbucket-pipelines-provider.md`

**What to build:** Validate what the provider emits against Atlassian's own grammar. Vendor the
official schema, record its provenance, wire the provider into the existing conformance suite, and
prove the suite rejects an unmodelled key.

**Blocked by:** 48 (Step vocabulary breadth)

**Status:** ready-for-agent

- [ ] The schema is vendored from `https://api.bitbucket.org/schemas/pipelines-configuration` as
      `bitbucket-pipelines.json`, byte-identical to the source on the copy date, keeping the upstream
      `$id`, 33,271 bytes, SHA-256
      `b37319267d9922bd9f0a5142d657551ae844e136fa205068c8660622d66bcf64`, draft-07, with no remote
      references.
- [ ] The vendored-copy table in `docs/references/upstream-schemas.md` gains the row for this file,
      its source, copy date and hash; the schema itself is never edited.
- [ ] The conformance suite discovers the provider by its schema file and validates every golden and
      every corpus entry with no test file added for the provider.
- [ ] The remote-reference check runs over every vendored schema, not GitHub Actions alone.
- [ ] The negative-fixture list becomes per provider, and Bitbucket's raw golden is its entry: the
      suite asserts the schema rejects it and names the unmodelled property in the failure.
- [ ] A document that passes the schema but carries an unmodelled key through `raw` is rejected by the
      suite, proving the check is not vacuous.
- [ ] If the pinned schema rejects a shape Bitbucket documents and the corpus uses, the ticket stops
      and reports rather than adding an exception.
- [ ] `pnpm check` passes.
