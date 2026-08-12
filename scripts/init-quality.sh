#!/usr/bin/env bash
#
# init-quality.sh — Personalize this quality-kit clone for a project workspace.
#
# Canonical flow:
#   git clone <project-quality-kit> <project>-quality && cd <project>-quality
#   ./scripts/init-quality.sh --name "Demo" --code demo
#   # optional: --kb-dir ../demo-knowledge-base  (auto-discovered if omitted)
#   # npm install + playwright chromium run by default after wire
#   npm run test:e2e:smoke
#
# Flags:
#   --name <string>           Project display name
#   --code <string>           Short code (normalized UPPERCASE)
#   --kb-dir <path>           Sibling knowledge-base dir (optional)
#   --web-dir <path>          Sibling frontend dir (overrides KB discovery)
#   --web-service <id>        KB service id for FE (default: first React/SPA/Vite)
#   --api-dir <path>          Sibling API dir (optional)
#   --port <n>                FE dev port override
#   --base-path <path>        FE base path override (e.g. /am)
#   --wire-web-scripts        Add convenience npm scripts into the web package.json
#   --no-wire-skills          Skip symlinking /.claude/skills into workspace (default: wire ON)
#   --no-npm-install          Skip npm install + playwright chromium (default: install ON)
#   --git-remote <url>        After init: git init (if needed) + set origin to team quality remote
#   --dry-run                 Print plan only
#   -h | --help
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

PROJECT_NAME=""
PROJECT_CODE=""
KB_DIR=""
WEB_DIR=""
WEB_SERVICE=""
API_DIR=""
PORT=""
BASE_PATH=""
WIRE_WEB=0
WIRE_SKILLS=1
NPM_INSTALL=1
GIT_REMOTE=""
DRY_RUN=0

log()  { printf '[quality-init] %s\n' "$*"; }
warn() { printf '[quality-init] WARN: %s\n' "$*" >&2; }
die()  { printf '[quality-init] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  sed -n '2,35p' "$0" | sed 's/\r$//; s/^# \{0,1\}//'
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) PROJECT_NAME="$2"; shift 2;;
    --code) PROJECT_CODE="$2"; shift 2;;
    --kb-dir) KB_DIR="$2"; shift 2;;
    --web-dir) WEB_DIR="$2"; shift 2;;
    --web-service) WEB_SERVICE="$2"; shift 2;;
    --api-dir) API_DIR="$2"; shift 2;;
    --port) PORT="$2"; shift 2;;
    --base-path) BASE_PATH="$2"; shift 2;;
    --wire-web-scripts) WIRE_WEB=1; shift;;
    --no-wire-skills) WIRE_SKILLS=0; shift;;
    --no-npm-install) NPM_INSTALL=0; shift;;
    --git-remote) GIT_REMOTE="$2"; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    -h|--help) usage;;
    *) die "Unknown flag: $1";;
  esac
done

# The canonical template must stay project-neutral. Personalize a clone only.
# (Checked after --help so maintainers can read flags on Base.)
if [[ "$(basename "$REPO_ROOT")" == "project-quality-kit" \
      && "${QUALITY_ALLOW_BASE_INIT:-0}" != "1" ]]; then
  die "Refusing to initialize the Base template '$REPO_ROOT'. Clone/copy it to '<project>-quality' first. For template-maintainer tests only, set QUALITY_ALLOW_BASE_INIT=1."
fi

# ── Interactive fallbacks ─────────────────────────────────────────
if [[ -z "$PROJECT_NAME" ]]; then
  read -r -p "Project name: " PROJECT_NAME
fi
if [[ -z "$PROJECT_CODE" ]]; then
  read -r -p "Project code (short): " PROJECT_CODE
fi
PROJECT_CODE="$(printf '%s' "$PROJECT_CODE" | tr '[:lower:]' '[:upper:]' | tr -cd 'A-Z0-9')"
[[ -n "$PROJECT_CODE" ]] || die "--code produced empty PROJECT_CODE"

# ── Discover sibling KB ───────────────────────────────────────────
WORKSPACE="$(cd "$REPO_ROOT/.." && pwd)"

discover_kb() {
  local d
  if [[ -n "$KB_DIR" ]]; then
    [[ -f "$KB_DIR/_meta/manifest.yml" ]] || die "KB dir missing manifest: $KB_DIR"
    (cd "$KB_DIR" && pwd)
    return
  fi
  for d in "$WORKSPACE"/*; do
    [[ -d "$d" ]] || continue
    if [[ -f "$d/_meta/manifest.yml" && -f "$d/CLAUDE.md" ]]; then
      echo "$d"
      return
    fi
  done
  echo ""
}

KB_ABS="$(discover_kb)"
if [[ -n "$KB_ABS" ]]; then
  log "KB discovered: $KB_ABS"
else
  warn "No sibling KB found — continuing with flags / prompts only"
fi

# ── Read FE/API from KB (Python — PyYAML usually available; fallback regex) ──
KB_WEB_REPO=""
KB_WEB_PORT=""
KB_WEB_BASE=""
KB_WEB_ID=""
KB_API_REPO=""
KB_API_PORT=""
KB_API_PREFIX=""
KB_API_ID=""
KB_CODE_ROOT=".."

if [[ -n "$KB_ABS" ]]; then
  EVAL="$(python3 - <<'PY' "$KB_ABS" "$WEB_SERVICE"
import sys, re, os
kb = sys.argv[1]
want = sys.argv[2].strip() if len(sys.argv) > 2 else ""

def read(p):
    try:
        return open(p, encoding="utf-8").read()
    except FileNotFoundError:
        return ""

manifest = read(os.path.join(kb, "_meta/manifest.yml"))
scan = read(os.path.join(kb, "_meta/config/scan-config.yml"))

# code_root
m = re.search(r'^code_root:\s*["\']?([^"\'\n]+)', scan, re.M)
code_root = m.group(1).strip() if m else ".."

# services blocks — naive split on "- id:"
blocks = re.split(r'\n\s*-\s*id:\s*', manifest)
services = []
for b in blocks[1:]:
    sid = re.match(r'["\']?([^"\'\n]+)', b)
    if not sid: continue
    id_ = sid.group(1).strip()
    def field(name, default=""):
        mm = re.search(rf'{name}:\s*["\']?([^"\'\n]+)', b)
        return mm.group(1).strip().strip('"') if mm else default
    services.append({
        "id": id_,
        "repo": field("repo"),
        "runtime": field("runtime"),
        "http_port": field("http_port", "0"),
        "route_prefix": field("route_prefix", "/"),
    })

def is_fe(s):
    r = s["runtime"].lower()
    return any(k in r for k in ("react", "spa", "vite", "vue", "angular", "next"))

def is_api(s):
    r = s["runtime"].lower()
    return any(k in r for k in (".net", "asp.net", "node", "java", "spring", "go ", "fastapi", "django")) and not is_fe(s)

fe = None
if want:
    fe = next((s for s in services if s["id"] == want), None)
if not fe:
    fe = next((s for s in services if is_fe(s)), None)
api = next((s for s in services if is_api(s)), None)

# path overrides from scan-config
def scan_path(sid):
    mm = re.search(rf'- id:\s*{re.escape(sid)}\s*\n(?:.*\n)*?\s*path:\s*([^\n]+)', scan)
    if not mm: return ""
    return mm.group(1).strip().strip('"').strip("'")

fe_path = scan_path(fe["id"]) if fe else ""
api_path = scan_path(api["id"]) if api else ""

def out(k, v):
    print(f"{k}={v}")

out("KB_CODE_ROOT", code_root)
if fe:
    out("KB_WEB_ID", fe["id"])
    out("KB_WEB_REPO", fe_path or fe["repo"])
    out("KB_WEB_PORT", fe["http_port"])
    out("KB_WEB_BASE", fe["route_prefix"])
if api:
    out("KB_API_ID", api["id"])
    out("KB_API_REPO", api_path or api["repo"])
    out("KB_API_PORT", api["http_port"])
    out("KB_API_PREFIX", api["route_prefix"])
PY
)"
  eval "$EVAL"
fi

# Resolve web dir
if [[ -z "$WEB_DIR" && -n "${KB_WEB_REPO:-}" ]]; then
  WEB_DIR="$(cd "$KB_ABS/$KB_CODE_ROOT/$KB_WEB_REPO" 2>/dev/null && pwd || true)"
  if [[ -z "$WEB_DIR" ]]; then
    WEB_DIR="$(cd "$WORKSPACE/$KB_WEB_REPO" 2>/dev/null && pwd || true)"
  fi
fi
if [[ -z "$WEB_DIR" ]]; then
  read -r -p "Frontend dir (absolute or relative to kit): " WEB_DIR
fi
# Normalize to absolute then re-relativize to kit
WEB_ABS="$(cd "$REPO_ROOT" && cd "$WEB_DIR" && pwd)"
WEB_REL="$(python3 - <<PY
import os
print(os.path.relpath("$WEB_ABS", "$REPO_ROOT"))
PY
)"

API_REL=""
API_ABS=""
if [[ -n "$API_DIR" ]]; then
  API_ABS="$(cd "$REPO_ROOT" && cd "$API_DIR" && pwd)"
elif [[ -n "${KB_API_REPO:-}" ]]; then
  API_ABS="$(cd "$WORKSPACE/$KB_API_REPO" 2>/dev/null && pwd || true)"
fi
if [[ -n "$API_ABS" ]]; then
  API_REL="$(python3 - <<PY
import os
print(os.path.relpath("$API_ABS", "$REPO_ROOT"))
PY
)"
fi

KB_REL=""
if [[ -n "$KB_ABS" ]]; then
  KB_REL="$(python3 - <<PY
import os
print(os.path.relpath("$KB_ABS", "$REPO_ROOT"))
PY
)"
fi

WEB_PORT="${PORT:-${KB_WEB_PORT:-5173}}"
WEB_BASE="${BASE_PATH:-${KB_WEB_BASE:-/}}"
API_PORT="${KB_API_PORT:-0}"
API_PREFIX="${KB_API_PREFIX:-}"
WEB_SID="${WEB_SERVICE:-${KB_WEB_ID:-}}"
API_SID="${KB_API_ID:-}"
BASELINE="${PROJECT_CODE}.OVERVIEW.DASHBOARD"

log "Plan:"
log "  name=$PROJECT_NAME code=$PROJECT_CODE"
log "  kb=$KB_REL"
log "  web=$WEB_REL port=$WEB_PORT base=$WEB_BASE service=$WEB_SID"
log "  api=$API_REL port=$API_PORT prefix=$API_PREFIX"
log "  wire_web_scripts=$WIRE_WEB"
log "  wire_skills=$WIRE_SKILLS"
log "  npm_install=$NPM_INSTALL"
log "  git_remote=${GIT_REMOTE:-"(none — recommend team remote later)"}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  if [[ "$WIRE_SKILLS" -eq 1 ]]; then
    log "Dry-run would also wire skills → $WORKSPACE/.claude/skills/"
    "$REPO_ROOT/scripts/wire-quality-skills.sh" --kit "$REPO_ROOT" --workspace "$WORKSPACE" --dry-run || true
  fi
  if [[ "$NPM_INSTALL" -eq 1 ]]; then
    log "Dry-run would also: npm install && npx playwright install chromium"
  fi
  if [[ -n "$GIT_REMOTE" ]]; then
    log "Dry-run would also: git init (if needed) + remote origin=$GIT_REMOTE"
  fi
  log "Dry-run — no files written"
  exit 0
fi

# ── Write _meta/project.yml ───────────────────────────────────────
cat > "$REPO_ROOT/_meta/project.yml" <<EOF
version: "1.0.0"

project:
  name: "$PROJECT_NAME"
  code: "$PROJECT_CODE"

paths:
  workspace_root: ".."
  kb_dir: "$KB_REL"
  web_dir: "$WEB_REL"
  api_dir: "$API_REL"

web:
  service_id: "$WEB_SID"
  http_port: $WEB_PORT
  base_path: "$WEB_BASE"
  package_manager: npm
  dev_command: "npm run dev"

api:
  service_id: "$API_SID"
  http_port: ${API_PORT:-0}
  route_prefix: "$API_PREFIX"

auth:
  strategy: cookie-fake
  cookie_name: access_token
  local_storage_keys:
    - ACCESS_TOKEN
    - access_token
    - token
  real:
    token_env: E2E_REAL_TOKEN
    login_url: ""
    token_endpoint: ""

session:
  me: "/accounts/me"
  permissions: "/accounts/permissions"
  functions: "/accounts/functions"
  my_apps: "/accounts/my-apps"
  check_session: "/accounts/check-session"
  app_code: "$PROJECT_CODE"
  baseline_permission:
    function_code: "$BASELINE"
    actions: ["VIEW"]

dto:
  list_items_key: items
  list_total_key: totalCount
  data_envelope: data

qc:
  excel_glob: "qc/input/*.xlsx"
  catalog_out: "qc/catalog.json"
  results_out: "qc/results.json"
  annotation_type: qcId

features:
  wire_web_scripts: $([[ "$WIRE_WEB" -eq 1 ]] && echo true || echo false)
  wire_skills: $([[ "$WIRE_SKILLS" -eq 1 ]] && echo true || echo false)
  e2e: true
  ai_review: false
EOF
log "Wrote _meta/project.yml"

# Mirror JSON for Playwright runtime (avoids requiring js-yaml at test time)
python3 - <<PY
import json, sys
from pathlib import Path
try:
    import yaml
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyyaml", "-q"])
    import yaml
root = Path("$REPO_ROOT")
cfg = yaml.safe_load((root / "_meta/project.yml").read_text(encoding="utf-8"))
(root / "_meta/project.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("[quality-init] Wrote _meta/project.json")
PY

# Stamp engine version init time
python3 - <<PY
from datetime import datetime, timezone
from pathlib import Path
p = Path("$REPO_ROOT/_meta/versions/engine-version.yml")
text = p.read_text(encoding="utf-8")
now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
import re
text2 = re.sub(r'^initialized_at:.*$', f'initialized_at: "{now}"', text, count=1, flags=re.M)
p.write_text(text2, encoding="utf-8")
PY

# ── Optional: wire scripts into web package.json ──────────────────
if [[ "$WIRE_WEB" -eq 1 ]]; then
  WEB_PKG="$WEB_ABS/package.json"
  if [[ ! -f "$WEB_PKG" ]]; then
    warn "web package.json not found — skip wire"
  else
    KIT_FROM_WEB="$(python3 - <<PY
import os
print(os.path.relpath("$REPO_ROOT", "$WEB_ABS"))
PY
)"
    python3 - <<PY
import json
from pathlib import Path
pkg_path = Path("$WEB_PKG")
pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
scripts = pkg.setdefault("scripts", {})
prefix = "npm --prefix $KIT_FROM_WEB"
mapping = {
    "test:e2e": f"{prefix} run test:e2e",
    "test:e2e:ui": f"{prefix} run test:e2e:ui",
    "test:e2e:smoke": f"{prefix} run test:e2e:smoke",
    "qc:import": f"{prefix} run qc:import",
    "qc:run": f"{prefix} run qc:run",
}
changed = False
for k, v in mapping.items():
    if scripts.get(k) != v:
        scripts[k] = v
        changed = True
if changed:
    pkg_path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("[quality-init] Wired npm scripts into web package.json")
else:
    print("[quality-init] Web scripts already wired")
PY
  fi
fi

mkdir -p "$REPO_ROOT/qc/input"
touch "$REPO_ROOT/qc/input/.gitkeep"

# ── Wire agent skills into workspace (default ON) ─────────────────
if [[ "$WIRE_SKILLS" -eq 1 ]]; then
  chmod +x "$REPO_ROOT/scripts/wire-quality-skills.sh" 2>/dev/null || true
  "$REPO_ROOT/scripts/wire-quality-skills.sh" --kit "$REPO_ROOT" --workspace "$WORKSPACE"
else
  log "Skipped skill wire (--no-wire-skills). Run later: ./scripts/wire-quality-skills.sh"
fi

# ── npm install + Playwright Chromium (default ON) ────────────────
if [[ "$NPM_INSTALL" -eq 1 ]]; then
  if ! command -v npm >/dev/null 2>&1; then
    warn "npm not found — skip install. Run later: npm install && npx playwright install chromium"
  else
    log "Running npm install…"
    (cd "$REPO_ROOT" && npm install --no-fund --no-audit) \
      || warn "npm install failed — fix network/registry then re-run manually"
    log "Installing Playwright Chromium…"
    (cd "$REPO_ROOT" && npx playwright install chromium) \
      || warn "playwright install chromium failed — run: npx playwright install chromium"
  fi
else
  log "Skipped npm install (--no-npm-install). Run later: npm install && npx playwright install chromium"
fi

# ── Optional: team git remote (never points at Base template) ─────
if [[ -n "$GIT_REMOTE" ]]; then
  if [[ "$GIT_REMOTE" == *"project-quality-kit"* ]]; then
    warn "git-remote looks like Base template URL — use the team's *-quality remote instead"
  fi
  if ! command -v git >/dev/null 2>&1; then
    warn "git not found — skip --git-remote"
  else
    if [[ ! -d "$REPO_ROOT/.git" ]]; then
      log "git init in clone…"
      (cd "$REPO_ROOT" && git init -b main) || (cd "$REPO_ROOT" && git init)
    fi
    # If origin still points at Base (fresh git clone of template), rename to keep upgrade source
    if (cd "$REPO_ROOT" && git remote get-url origin >/dev/null 2>&1); then
      ORIGIN_URL="$(cd "$REPO_ROOT" && git remote get-url origin)"
      if [[ "$ORIGIN_URL" == *"project-quality-kit"* ]] && ! (cd "$REPO_ROOT" && git remote get-url upstream-quality-kit >/dev/null 2>&1); then
        log "Renaming origin (Base) → upstream-quality-kit"
        (cd "$REPO_ROOT" && git remote rename origin upstream-quality-kit)
      fi
    fi
    if (cd "$REPO_ROOT" && git remote get-url origin >/dev/null 2>&1); then
      log "Updating origin → $GIT_REMOTE"
      (cd "$REPO_ROOT" && git remote set-url origin "$GIT_REMOTE")
    else
      log "Adding origin → $GIT_REMOTE"
      (cd "$REPO_ROOT" && git remote add origin "$GIT_REMOTE")
    fi
    log "Git ready. Commit project files then: git push -u origin main"
    if (cd "$REPO_ROOT" && git remote get-url upstream-quality-kit >/dev/null 2>&1); then
      log "Kept remote upstream-quality-kit for /quality-upgrade --from"
    fi
  fi
else
  log "Tip: later bind team remote — ./scripts/init-quality.sh … --git-remote <url>"
  log "     or see GETTING-STARTED.md §7 (do not push project data to Base)."
fi

log "Done. Next:"
log "  npm run test:e2e:smoke"
log "  # or agent: /quality-test , /quality-qc-import"
log "  # QC Excel: cp your file to qc/input/ && npm run qc:import"
log "  # Real mode: docs/auth-real.md"
log "  # CI smoke: ci/README.md"
