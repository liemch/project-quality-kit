#!/usr/bin/env bash
#
# verify-base-template.sh — Assert project-quality-kit stays project-neutral.
# Exit 0 = Base clean; non-zero = leaks / missing template essentials.
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fail=0
ok()   { printf '  OK  %s\n' "$*"; }
bad()  { printf '  FAIL %s\n' "$*" >&2; fail=1; }

echo "[verify-base] $ROOT"

[[ "$(basename "$ROOT")" == "project-quality-kit" ]] || bad "basename must be project-quality-kit (got $(basename "$ROOT"))"

# Must exist
for f in \
  _meta/project.example.yml \
  _meta/project.smoke.yml \
  _meta/versions/engine-version.yml \
  scripts/init-quality.sh \
  scripts/verify-base-template.sh \
  scripts/lib/refuse-base.mjs \
  e2e/specs/qc/.gitkeep \
  e2e/pages/.gitkeep \
  playwright/.auth/.gitkeep \
  qc/input/.gitkeep
do
  [[ -e "$ROOT/$f" ]] && ok "exists $f" || bad "missing $f"
done

# Must NOT exist (project leaks)
for f in \
  _meta/project.yml \
  _meta/project.json \
  qc/catalog.json \
  qc/coverage.json \
  qc/results.json \
  qc/results.xlsx
do
  if [[ -e "$ROOT/$f" ]]; then bad "leak $f"; else ok "absent $f"; fi
done

if compgen -G "$ROOT/qc/input/*.xlsx" > /dev/null; then
  bad "leak qc/input/*.xlsx"
else
  ok "absent qc/input/*.xlsx"
fi

if compgen -G "$ROOT/e2e/specs/qc/*.generated.spec.ts" > /dev/null; then
  bad "leak e2e/specs/qc/*.generated.spec.ts"
else
  ok "absent generated specs"
fi

# engine initialized_at should be empty/null for pristine Base
if grep -qE 'initialized_at: *("|'"'"')?[0-9]{4}-' "$ROOT/_meta/versions/engine-version.yml"; then
  bad "initialized_at still set — reset to null for Base"
else
  ok "initialized_at unset"
fi

# init guard smoke
if QUALITY_ALLOW_BASE_INIT=0 "$ROOT/scripts/init-quality.sh" --name X --code X --dry-run >/dev/null 2>&1; then
  bad "init-quality.sh did not refuse Base"
else
  ok "init refuses Base"
fi

if [[ "$fail" -ne 0 ]]; then
  echo "[verify-base] FAILED"
  exit 1
fi
echo "[verify-base] PASSED"
