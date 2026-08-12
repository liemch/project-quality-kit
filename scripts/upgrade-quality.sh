#!/usr/bin/env bash
#
# upgrade-quality.sh — Pull engine updates from upstream template while keeping
# project-owned artifacts (domains, specs, qc catalog, _meta/project.yml).
#
# Usage:
#   ./scripts/upgrade-quality.sh --from /path/to/project-quality-kit
#   ./scripts/upgrade-quality.sh --from git@…:project-quality-kit.git --ref main
#
# Preserved (never overwritten):
#   _meta/project.yml
#   e2e/fixtures/domains/**          (except domains/_upstream-example if present)
#   e2e/specs/**                     (except e2e/specs/smoke/** which is refreshed)
#   e2e/pages/**
#   e2e/config/**
#   qc/catalog.json, qc/coverage.json, qc/input/**
#
# Refreshed from upstream:
#   e2e/fixtures/{core,crud-resource,harness,load-config}.ts
#   e2e/fixtures/adapters/**
#   e2e/fixtures/factories/**
#   e2e/fixtures/ui/**
#   e2e/fixtures/domains/example-crud.ts   (demo only; other domains preserved)
#   e2e/qc/**
#   e2e/specs/smoke/**
#   e2e/specs/auth.setup.ts
#   scripts/**
#   .claude/skills/**          (agent skills — re-wire after upgrade)
#   playwright.config.ts
#   package.json (merge devDependencies only — never wipe scripts)
#   docs/**, README.md, COOKBOOK.md, GETTING-STARTED.md, CHANGELOG.md
#   ai-review/README.md, rules, prompts, ci   (preserve ai-review/project/)
#   ci/**
#   _meta/project.example.yml, _meta/project.smoke.yml, _meta/versions/engine-version.yml
#   scripts/verify-base-template.sh, scripts/lib/**
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FROM=""
REF="main"
DRY_RUN=0

log()  { printf '[quality-upgrade] %s\n' "$*"; }
warn() { printf '[quality-upgrade] WARN: %s\n' "$*" >&2; }
die()  { printf '[quality-upgrade] ERROR: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from) FROM="$2"; shift 2;;
    --ref) REF="$2"; shift 2;;
    --kit) REPO_ROOT="$(cd "$2" && pwd)"; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    -h|--help) sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *) die "Unknown flag: $1";;
  esac
done

[[ -n "$FROM" ]] || die "--from is required (path or git URL)"

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

if [[ -d "$FROM" ]]; then
  log "Using local upstream: $FROM"
  SRC="$(cd "$FROM" && pwd)"
else
  log "Cloning $FROM @$REF"
  git clone --depth 1 --branch "$REF" "$FROM" "$TMP/upstream"
  SRC="$TMP/upstream"
fi

[[ -f "$SRC/_meta/versions/engine-version.yml" ]] || die "Upstream missing engine-version.yml"

copy_path() {
  local rel="$1"
  if [[ ! -e "$SRC/$rel" ]]; then
    log "skip missing upstream: $rel"
    return
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "DRY would refresh: $rel"
    return
  fi
  mkdir -p "$(dirname "$REPO_ROOT/$rel")"
  rm -rf "$REPO_ROOT/$rel"
  cp -a "$SRC/$rel" "$REPO_ROOT/$rel"
  log "refreshed: $rel"
}

for rel in \
  e2e/fixtures/core.ts \
  e2e/fixtures/crud-resource.ts \
  e2e/fixtures/harness.ts \
  e2e/fixtures/load-config.ts \
  e2e/fixtures/adapters \
  e2e/fixtures/factories \
  e2e/fixtures/ui \
  e2e/fixtures/domains/example-crud.ts \
  e2e/qc \
  e2e/specs/smoke \
  e2e/specs/auth.setup.ts \
  playwright/.auth/.gitkeep \
  e2e/pages/.gitkeep \
  tsconfig.json \
  .gitignore \
  .gitattributes \
  .env.example \
  scripts \
  .claude/skills \
  playwright.config.ts \
  docs \
  README.md \
  COOKBOOK.md \
  GETTING-STARTED.md \
  CHANGELOG.md \
  ai-review/README.md \
  ai-review/rules \
  ai-review/prompts \
  ai-review/ci \
  ci \
  _meta/project.example.yml \
  _meta/project.smoke.yml \
  _meta/versions/engine-version.yml
do
  copy_path "$rel"
done

# Ensure ai-review/project exists for project-owned rules (never wiped)
if [[ "$DRY_RUN" -eq 0 ]]; then
  mkdir -p "$REPO_ROOT/ai-review/project"
  [[ -f "$REPO_ROOT/ai-review/project/.gitkeep" ]] || touch "$REPO_ROOT/ai-review/project/.gitkeep"
fi

# Merge package.json devDependencies
if [[ "$DRY_RUN" -eq 0 ]]; then
  python3 - <<PY
import json
from pathlib import Path
mine = Path("$REPO_ROOT/package.json")
ups = Path("$SRC/package.json")
a = json.loads(mine.read_text())
b = json.loads(ups.read_text())
deps = a.setdefault("devDependencies", {})
deps.update(b.get("devDependencies") or {})
# ensure quality scripts exist / stay aligned with engine for qc:* and test:e2e*
scripts = a.setdefault("scripts", {})
for k, v in (b.get("scripts") or {}).items():
    if k.startswith("qc:") or k.startswith("test:e2e") or k in ("verify:base", "test:e2e-real"):
        scripts[k] = v
    else:
        scripts.setdefault(k, v)
# align package version with upstream engine when present
if b.get("version"):
    a["version"] = b["version"]
mine.write_text(json.dumps(a, indent=2, ensure_ascii=False) + "\n")
print("[quality-upgrade] merged package.json scripts/devDependencies + version")
PY
fi

if [[ "$DRY_RUN" -eq 0 ]]; then
  chmod +x "$REPO_ROOT/scripts/wire-quality-skills.sh" 2>/dev/null || true
  "$REPO_ROOT/scripts/wire-quality-skills.sh" --kit "$REPO_ROOT" || warn "wire-skills failed — run /quality-wire manually"
fi

log "Done. Review diff, then: npm install && npm run test:e2e:smoke"
log "Preserved: _meta/project.yml, e2e/fixtures/domains, project specs/pages, qc/input"
