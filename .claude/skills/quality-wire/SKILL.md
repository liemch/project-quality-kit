---
name: quality-wire
description: >
  Symlink Project Quality Kit skills into the workspace root (.claude/skills/)
  and refresh the Quality Kit blurb in CLAUDE.md. Use when the user says
  "/quality-wire", "/quality wire", "wire quality skills", "cài skill quality
  vào workspace", or after cloning/upgrading the kit when /quality is not
  visible from the workspace root.
---

# /quality-wire — Wire skills into workspace

## Procedure

1. Resolve `KIT_ROOT` (walk up for `_meta/project.yml` / `project.json`, or sibling `*-quality`). Prefer the project clone — not Base `project-quality-kit` — when both exist.
2. Workspace = parent of `KIT_ROOT` (or ask if unclear).
3. Run:

```bash
cd "$KIT_ROOT"
chmod +x ./scripts/wire-quality-skills.sh
./scripts/wire-quality-skills.sh --workspace "$WORKSPACE"
```

4. Verify symlinks:

```bash
ls -la "$WORKSPACE/.claude/skills"/quality*
```

5. Reply briefly: which skills linked + whether `CLAUDE.md` blurb was updated.

## Notes

- Idempotent: safe to re-run.
- Does **not** modify web/api source — only workspace `.claude/skills` + optional `CLAUDE.md` section.
- Called automatically by `init-quality.sh` unless `--no-wire-skills`.
