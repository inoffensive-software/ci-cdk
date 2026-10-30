#!/usr/bin/env bash
# Everything CI does. It lives in bash so the workflow YAML stays declarative and thin.
set -euo pipefail

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"

pnpm install --frozen-lockfile

# The generator imports the built barrel, and typecheck reads its declarations.
pnpm compile

bash tools/ci/check-workflow.sh

pnpm check
