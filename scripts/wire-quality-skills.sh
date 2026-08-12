#!/usr/bin/env bash
#
# wire-quality-skills.sh — Symlink quality skills into the workspace root
# so agents can invoke /quality* from the multi-repo workspace (same pattern as KB).
#
# Usage (from kit root, or any cwd with --kit):
#   ./scripts/wire-quality-skills.sh
#   ./scripts/wire-quality-skills.sh --workspace /path/to/workspace
#   ./scripts/wire-quality-skills.sh --dry-run
#
# Target: <workspace>/.claude/skills/<name> → relative symlink into this kit's
#         .claude/skills/<name>
#
# Also appends a short "Quality Kit skills" blurb to <workspace>/CLAUDE.md
# if that file exists and the blurb is not already present.
#
set -euo pipefail

KIT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE=""
DRY_RUN=0

log()  { printf '[quality-wire] %s\n' "$*"; }
warn() { printf '[quality-wire] WARN: %s\n' "$*" >&2; }
die()  { printf '[quality-wire] ERROR: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --kit) KIT_ROOT="$(cd "$2" && pwd)"; shift 2;;
    --workspace) WORKSPACE="$(cd "$2" && pwd)"; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *) die "Unknown flag: $1";;
  esac
done

[[ -d "$KIT_ROOT/.claude/skills" ]] || die "No skills in kit: $KIT_ROOT/.claude/skills"

if [[ -z "$WORKSPACE" ]]; then
  WORKSPACE="$(cd "$KIT_ROOT/.." && pwd)"
fi

SKILLS_SRC="$KIT_ROOT/.claude/skills"
SKILLS_DST="$WORKSPACE/.claude/skills"
mkdir -p "$SKILLS_DST"

# Discover skill dirs (directories that contain SKILL.md)
mapfile -t SKILL_NAMES < <(
  find "$SKILLS_SRC" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
)

if [[ ${#SKILL_NAMES[@]} -eq 0 ]]; then
  die "No skill directories under $SKILLS_SRC"
fi

log "Workspace: $WORKSPACE"
log "Kit:       $KIT_ROOT"
log "Skills:    ${SKILL_NAMES[*]}"

for name in "${SKILL_NAMES[@]}"; do
  src="$SKILLS_SRC/$name"
  dst="$SKILLS_DST/$name"
  [[ -f "$src/SKILL.md" ]] || { warn "skip $name (no SKILL.md)"; continue; }

  rel="$(python3 - <<PY
import os
print(os.path.relpath("$src", "$SKILLS_DST"))
PY
)"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "DRY would link: $dst -> $rel"
    continue
  fi

  if [[ -L "$dst" ]]; then
    current="$(readlink "$dst")"
    if [[ "$current" == "$rel" ]]; then
      log "ok (exists): $name"
      continue
    fi
    rm -f "$dst"
  elif [[ -e "$dst" ]]; then
    warn "skip $name — $dst exists and is not a symlink"
    continue
  fi

  ln -sfn "$rel" "$dst"
  log "linked: $name -> $rel"
done

# Blurb in workspace CLAUDE.md
BLURB_BEGIN="<!-- BEGIN: quality-kit-skills -->"
BLURB_END="<!-- END: quality-kit-skills -->"
CLAUDE="$WORKSPACE/CLAUDE.md"
KIT_REL="$(python3 - <<PY
import os
print(os.path.relpath("$KIT_ROOT", "$WORKSPACE"))
PY
)"

BLURB=$(cat <<EOF
$BLURB_BEGIN
## Quality Kit skills

Active project kit: \`${KIT_REL}/\` (Playwright e2e + QC Excel bridge).
Keep project config, QC data, and generated specs in this \`<project>-quality\` clone; never initialize the Base template in place.

| Skill | Use |
|-------|-----|
| \`/quality\` | Router (init / test / qc / upgrade / …) |
| \`/quality-init\` | Onboard kit vào dự án chưa có |
| \`/quality-wire\` | (Re)symlink skills vào workspace |
| \`/quality-test\` | Chạy e2e / smoke |
| \`/quality-qc-import\` | Import Excel QC → catalog |
| \`/quality-qc-codegen\` | Sinh stub test.fixme từ catalog |
| \`/quality-qc-run\` | Chạy theo TC id / priority |
| \`/quality-add-domain\` | Scaffold domain harness |
| \`/quality-upgrade\` | Nâng cấp engine từ upstream |
| \`/quality-status\` | Xem config web/port/KB |
| \`/quality-ai-review\` | AI review CI (phase 2 placeholder) |

Run skills with cwd anywhere in the workspace; they resolve the kit via \`_meta/project.yml\` or sibling \`*-quality/\`.
$BLURB_END
EOF
)

if [[ -f "$CLAUDE" ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    if grep -q "$BLURB_BEGIN" "$CLAUDE"; then
      log "DRY would refresh Quality Kit blurb in CLAUDE.md"
    else
      log "DRY would append Quality Kit blurb to CLAUDE.md"
    fi
  else
    TMP_BLURB="$(mktemp)"
    printf '%s\n' "$BLURB" > "$TMP_BLURB"
    python3 - <<PY
from pathlib import Path
p = Path("$CLAUDE")
text = p.read_text(encoding="utf-8")
begin, end = "$BLURB_BEGIN", "$BLURB_END"
blurb = Path("$TMP_BLURB").read_text(encoding="utf-8").rstrip() + "\n"
i, j = text.find(begin), text.find(end)
if i >= 0 and j >= 0:
    j += len(end)
    if j < len(text) and text[j] == "\n":
        j += 1
    p.write_text(text[:i] + blurb + text[j:], encoding="utf-8")
    print("[quality-wire] Refreshed Quality Kit blurb in CLAUDE.md")
else:
    p.write_text(text.rstrip() + "\n\n" + blurb, encoding="utf-8")
    print("[quality-wire] Appended Quality Kit blurb to CLAUDE.md")
PY
    rm -f "$TMP_BLURB"
  fi
else
  warn "No $CLAUDE — skills linked only (create CLAUDE.md later if needed)"
fi

log "Done. Skills available as /quality, /quality-init, /quality-test, …"
