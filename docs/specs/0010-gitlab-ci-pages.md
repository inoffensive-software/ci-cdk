# Spec 0010: GitLab CI pages

Status: ready-for-agent
Covers: the two surfaces GitLab calls `pages`: the job name at the document root, and the job keyword.
Respects: ADR 0005, ADR 0008, ADR 0010, ADR 0014, specs 0006, 0009.

## Problem Statement

`pages` accounts for most of the deferred schema paths. The pinned schema settles what looked like two
surfaces: its root `pages` property is `$ref: job`, the same definition as `additionalProperties`, so
the root form is a **job whose name is its key**, not a pipeline keyword. Only the job-level `pages`
keyword (`true` or `{ publish, path_prefix, expire_in }`) is new grammar.

Treating the root form as a pipeline field duplicates the whole job body in the vocabulary and adds a
second spelling for every job-body path. The gate should instead normalise the root `$.pages` subtree
onto the job-name wildcard, so the documented grammar counts the job body once.

## Solution

Two tickets. Ticket 101 makes the root `pages` a job name: no field, no reserved keyword, and a schema
gate that maps `$.pages.*` to `$.*.*`. Ticket 102 models the job-level `pages` keyword from the pinned
schema and GitLab's Pages documentation, with a documentation-derived fixture where no real pinned
config uses it.

## User Stories

1. As a library consumer, I want `job({ name: "pages", ... })` to be legal, so that a Pages job is an
   ordinary job.
2. As a library consumer, I want job-level `pages` typed, so that a job that publishes Pages is not raw.
3. As a maintainer, I want the key list derived from the schema walk and docs, so that the shape is not guessed.
4. As a maintainer, I want each ticket to delete its gap row and add its still-missing children, so progress is visible.
5. As a maintainer, I want a docs-derived fixture marked in provenance, so the evidence is honest.

## Implementation Decisions

- Root `pages` has no `Pipeline` field and is not a `GLOBAL_KEYWORDS` entry; the schema walk maps its
  subtree onto `$.*` and dedupes before the gap comparison.
- Job `pages` is an optional map or `true`. The ticket derives the exact keys from the schema slice and
  the Pages docs, and writes them in the spec's fixed order.
- Values are `Text`/`Scalar`/boolean as the docs define; absent keys are not emitted.
- Raw collides with the job keyword only; a job named `pages` is not a collision.
- The fixture is documentation-derived unless a redistributable pinned config is found; provenance says
  which, with the doc page and date.
- No deployment semantics, no URL generation, no validation of the target project.
- Adds an ADR only if the shape changes a settled decision; a plain map does not.

## Testing Decisions

- Seam: `render(pipeline(...))`, plus corpus data equality if a real entry is used.
- The inventory includes a job named `pages` without raw.
- The schema gate proves `$.pages` is absent from the documented grammar and `$.pages.x` becomes `$.*.x`.
- The schema-gap report drops `$.pages`; `$.*.pages` stays until ticket 102 models it.
- A golden pins job-level pages in the fixed order.
- `pnpm check` is the exit gate.

## Out of Scope

- Executing or validating a Pages deployment.
- Access control, domains and TLS settings that live outside `.gitlab-ci.yml`.
- Any other deferred keyword; spec 0009 owns those.

## Further Notes

- Ticket numbers are reserved in spec 0009's 100 block: 101 root name, 102 job keyword.
- If the schema and docs disagree, stop and report; do not pick one silently.
