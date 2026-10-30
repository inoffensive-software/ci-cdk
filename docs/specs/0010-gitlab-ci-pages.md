# Spec 0010: GitLab CI pages

Status: ready-for-agent
Covers: `pages` at pipeline and job level, the deferred keyword that dominates spec 0009's target.
Respects: ADR 0005, ADR 0008, ADR 0010, ADR 0014, specs 0006, 0009.

## Problem Statement

`pages` accounts for 378 of the 468 deferred schema paths. It is why spec 0009's 87.5% target is
reachable at all, and it is too large to bury inside a general vocabulary ticket: pipeline-level
`pages` alone is 374 paths, with job-level `pages` adding four.

The shapes are deployment configuration, not job scheduling: publish settings, paths, expiry, and in
newer GitLab versions a pipeline-level block that decides what the Pages deployment contains. A ticket
that guesses the key list from a summary would cement the wrong grammar.

## Solution

Model both surfaces behind the `pages` keyword, deriving the exact key list from the pinned schema and
GitLab's Pages documentation, with a documentation-derived fixture where no real pinned config uses
the form. Two tickets: pipeline-level first, job-level second, each ending at `render` and a schema-gap
row that disappears.

## User Stories

1. As a library consumer, I want pipeline-level `pages` typed, so that a Pages deployment is not raw.
2. As a library consumer, I want job-level `pages` typed, so that a job that publishes Pages is not raw.
3. As a maintainer, I want the key list derived from the schema walk and docs, so that the shape is not guessed.
4. As a maintainer, I want each ticket to delete its gap row and add its still-missing children, so progress is visible.
5. As a maintainer, I want a docs-derived fixture marked in provenance, so the evidence is honest.

## Implementation Decisions

- Pipeline `pages` is an optional map; job `pages` is an optional map. The ticket derives the exact keys
  from the schema slice and the Pages docs, and writes them in the spec's fixed order.
- Values are `Text`/`Scalar`/boolean as the docs define; absent keys are not emitted.
- Raw collides with `pages` at both levels.
- The fixture is documentation-derived unless a redistributable pinned config is found; provenance says
  which, with the doc page and date.
- No deployment semantics, no URL generation, no validation of the target project.
- Adds an ADR only if the shape changes a settled decision; a plain map does not.

## Testing Decisions

- Seam: `render(pipeline(...))`, plus corpus data equality if a real entry is used.
- Inventory exercises every modelled key without raw; the schema-gap report drops `$.*.pages` and
  `$.pages` and adds their still-missing children.
- A golden pins pipeline and job pages in the fixed order.
- `pnpm check` is the exit gate.

## Out of Scope

- Executing or validating a Pages deployment.
- Access control, domains and TLS settings that live outside `.gitlab-ci.yml`.
- Any other deferred keyword; spec 0009 owns those.

## Further Notes

- Ticket numbers are reserved in spec 0009's 100 block: 101 pipeline, 102 job.
- If the schema and docs disagree, stop and report; do not pick one silently.
