# 0010: a string and a number are distinct at the boundary

**Status:** Accepted

## Context

`fromValue` lowers every JavaScript string to `scalar(text)` with no marker, and the YAML serializer
in `renderDoc` treats untagged plain text as typed when the text is a canonical number: `canonicalNumber`
turns `"42"` and `"1.5"` into the numbers `42` and `1.5`, while text such as `"42.0"` or `"1.10"` keeps
its quotes. A number is lowered as `scalar(String(n))`, with the same text and no marker either. By the
time the emitter sees them, the string `"1.5"` and the number `1.5` are the same node, and the emitter
has to guess.

Core already tags the two leaves whose text is also a legal string: `NULL_TAG` and `BOOL_TAG` in
`doc.ts` separate the literal from the string that spells it, and `renderDoc` resolves each marker back
to a typed value without repeating the tag. A canonical number is the third such collision, and the only
one still unresolved.

ADR 0005 makes the corpus compare parsed data, so this is not a formatting argument. The first GitLab
corpus entry, `gitlab-org/terraform-images` at `4230b972896ea9b4c23322855bcf76256e5ae1c9`, writes
`STABLE_VERSION: "1.5"` and five `TERRAFORM_VERSION` matrix values `"1.5"` through `"1.1"`. Parsing the
vendored file yields strings; rendering the fixture yielded numbers, so the pinned config could not be
reproduced even with every key expressible through `raw`.

Ticket 18 widened the scalar types and added `src/github-actions/scalars.test.ts`, but deliberately left
the coercion in place, so `job.container.ports: [8080, "9090"]` still emitted `- 9090` for the string.

## Decision

The distinction is made at the boundary, in core, next to the existing markers:

- `doc.ts` gains `STRING_TAG`, the string counterpart of `NULL_TAG` and `BOOL_TAG`.
- `fromValue` tags a string whose text is a canonical number with `STRING_TAG`; every other string stays
  untagged.
- The serializer resolves `STRING_TAG` to a double-quoted scalar and never emits it as a tag. Untagged
  canonical text still means a number, so `fromValue({ n: 42 })` and `fromValue({ s: "42" })` emit
  `n: 42` and `s: "42"`.
- The canonical-number predicate moves to `src/core/canonical-number.ts` and both `fromValue` and
  `serialize.ts` import it, so the two cannot disagree about which text is a number.

This follows the precedent ADR 0002 D3 sets for `null` and booleans: type identity travels as a marker
and presentation is resolved once, in the shared serializer, rather than inferred per provider. It is a
breaking change to emitted bytes for any consumer that passed a numeric-looking string.

## Consequences

- A numeric-looking string now emits quoted and parses back as a string, which is what the caller wrote.
  `job-shape.test.ts`'s `ports: [8080, "9090"]` golden changes from `- 9090` to `- "9090"`, and the
  quoting test that pinned the old ambiguity now pins the distinction.
- Number literals are unchanged. `String(n)` is still the text of a number, and untagged canonical text
  still emits unquoted, so every golden that only carries numbers is unaffected.
- An explicit `tagged("!!str", …)` resolves like the other markers: the quoted value already says what
  it is, so the tag is not repeated. A caller wanting a visible secondary tag uses a non-marker tag such
  as `!reference`.
- `fromValue` still sets no scalar style; it records type identity only, and the serializer chooses the
  one style a quoted string can have. Invariant 9 in `docs/architecture.md` still holds in its letter,
  but the tag now carries information derived from the text, which is the same trade `!!null` and
  `!!bool` already make.
- The GitLab corpus fixture can express upstream's `"1.5"` values without a provider-local escape, so
  ADR 0008's public surface does not grow.

## Alternatives

- **A provider-local leaf for numeric-looking strings.** Rejected: it hides a gap that is not
  provider-specific. Every provider meets text that is also a number, and a leaf would only move the
  guess from core to each caller.
- **Leave the coercion and accept the corpus mismatch.** Rejected: the corpus is the definition of
  support (ADR 0005), and a config that cannot be reproduced is a false negative about the vocabulary.
- **Emit the `!!str` tag visibly.** Rejected: the tag is a core marker, not part of the format contract,
  and quoting already makes the value a string. A visible tag would also change every consumer's bytes
  for no gain in fidelity.
