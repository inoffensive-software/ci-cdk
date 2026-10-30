#!/usr/bin/env bash
# Regenerates .github/workflows/ci.yml from tools/ci/workflow.mts and fails when the committed copy
# differs. Regenerating in place means a local run leaves the corrected file behind, ready to commit.
set -euo pipefail

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"

node tools/ci/workflow.mts > .github/workflows/ci.yml

# `git diff` alone would miss an untracked file, which is exactly the mistake of forgetting to commit
# the generated workflow, so status is the check and diff is the explanation.
drift=$(git status --porcelain -- .github/workflows)

if [ -n "$drift" ]; then
  echo "$drift" >&2
  git diff -- .github/workflows >&2
  echo "error: .github/workflows/ci.yml is stale or untracked; the regenerated file is above." >&2
  echo "       commit it (pnpm ci:workflow) before pushing." >&2
  exit 1
fi
