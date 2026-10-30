# 0009: double-quoted scalars stay on one line

**Status:** Accepted

## Context

ADR 0002 D3 gives the project exactly one YAML serializer, and D5 forbids blank lines in its output
apart from the header comment. A plain scalar carrying a newline is therefore emitted double-quoted,
because that is the only style whose escapes keep the value intact without a block scalar's trailing
newline.

The `yaml` writer, given a long double-quoted scalar, will fold it across physical lines and separate
those lines with a blank line:

```yaml
script: "if [ -f pnpm-lock.yaml ]; then

  \  pnpm install --frozen-lockfile

  fi"
```

That output parses back to the original string, so it is not a data bug; it is a contract violation.
`renderDoc` rejects the blank line, so a realistic GitLab `script:` — a shell `if` block is the
ordinary case, and it is already longer than the roughly 35-character fold threshold — throws
`$: the serializer emitted a blank line` instead of rendering. GitLab has no `script()` leaf to route
the value into a literal block the way the GitHub provider does, so the fold cannot be dodged at the
provider layer.

## Decision

The serializer is configured with `doubleQuotedAsJSON: true`. A double-quoted scalar is written as a
single JSON-escaped line regardless of length.

## Consequences

- Multi-line double-quoted text is one physical line with `\n` escapes. The parsed value is unchanged:
  it is still exactly the string that was supplied, with no trailing newline added.
- The format produces no blank lines from quoted scalars, so a realistic multi-line command renders
  and round-trips. Nothing else about the emitted format moves, so existing goldens are unaffected.
- Any future change to this option is a format change: it changes emitted bytes for every long
  double-quoted scalar and must be treated like any other golden-changing edit.

## Alternatives

- **Emit multi-line script strings as a literal block.** Rejected: style must travel with the value,
  not be inferred from its content. Inferring a block here would add a trailing newline, changing the
  parsed value, and it reintroduces the provider-specific lowering ADR 0002 D3 keeps out of the
  serializer.
- **Leave the fold and document the length limit.** Rejected: it makes ordinary multi-line scripts
  unrenderable, and the failure is a thrown diagnostic at render time rather than something a caller
  can work around without rewriting the command.
