#!/usr/bin/env bash
# Regenerates every generated workflow under .github/workflows and fails when a committed copy
# differs. Regenerating in place means a local run leaves the corrected files behind, ready to
# commit.
set -euo pipefail

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"

node tools/ci/workflow.mts > .github/workflows/ci.yml
node tools/ci/release.mts > .github/workflows/release.yml

# `git diff` alone would miss an untracked file, which is exactly the mistake of forgetting to commit
# a generated workflow, so status is the check and diff is the explanation.
drift=$(git status --porcelain -- .github/workflows)

if [ -n "$drift" ]; then
  echo "$drift" >&2
  git diff -- .github/workflows >&2
  echo "error: a generated workflow is stale or untracked; the regenerated files are above." >&2
  echo "       commit them (pnpm ci:workflow) before pushing." >&2
  exit 1
fi
