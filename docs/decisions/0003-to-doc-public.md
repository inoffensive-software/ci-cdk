# 0003: `toDoc` is public provider surface

**Status:** Accepted

## Context

Spec 0002 names two public seams: `render(workflow, options)` as the primary one, and `toDoc(workflow)`
as the secondary. The second exists because a byte diff says a file is wrong but not which stage
produced it: declared key order, the `jobs` array to map lowering and leaf styles are all decided
before the emitter runs, and none of them can be observed from text alone.

The provider surface block in `docs/architecture.md` listed `to-doc.ts` as "the single lowering
function" and the barrel as "re-exports only". Neither line said whether `toDoc` could be imported,
so the public boundary was a decision nobody had recorded.

## Decision

`toDoc(workflow)` is exported from the provider subpath. It returns the ordered `Doc` the emitter
will see, and the barrel declares nothing.

This changes the `index.ts` line in the `Provider surface` block of `docs/architecture.md` from
`barrel; re-exports only` to name the public exports, and the `to-doc.ts` line now names `toDoc` as
public. That section is the anchor this record changes, and it lists the export.

## Consequences

- A consumer can inspect the ordered tree without importing from `src/` or reimplementing lowering.
- The public surface grows by one function. It is still a data layer: no builder, no lifecycle.
- The `Doc` shape returned by `toDoc` is now observed. The format contract already froze it through
  goldens, so this records an existing constraint rather than adding one.
- `toDoc` will remain the only place that validates a whole document once document validation lands
  (ticket 12), so the debugging surface and the validation site stay the same function.

## Alternatives

- **Keep `toDoc` internal.** Rejected: the only way to explain a wrong byte would be to edit the
  source and add a temporary log, and the spec's structural tests would have no public seam.
- **Export a rendered preview instead.** Rejected: it is the emitter under a second name. The
  question `toDoc` answers is which stage chose the shape, and text has already lost that.
