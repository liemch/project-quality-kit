---
name: quality-status
description: >
  Show Project Quality Kit configuration status (web/api/kb paths, ports,
  wire flags, engine version). Use when the user says "/quality-status",
  "/quality status", "quality đang trỏ web nào", or "kiểm tra config e2e kit".
---

# /quality-status — Config snapshot

## Procedure

1. Resolve `KIT_ROOT`.
2. Read `_meta/project.yml` (or `project.json`) + `_meta/versions/engine-version.yml`.
3. Resolve paths on disk (exist? yes/no).
4. Check workspace skill links: `../.claude/skills/quality` symlink ok?
5. Reply in a short table:

```
Kit:     <KIT_ROOT>
Engine:  <engine_version>  initialized_at=<…>
Project: <name> (<code>)
Web:     <web_dir>  exists=<y/n>  port=<n>  base=<path>  service=<id>
API:     <api_dir>  port=<n>  prefix=<…>
KB:      <kb_dir or (none)>
Wire:    web_scripts=<bool>  skills=<bool>
Skills:  workspace links=<ok|missing>  (run /quality-wire if missing)
QC:      catalog=<exists|missing>  results=<exists|missing>
```

Read-only — do not modify files unless user asks to fix (then `/quality-wire` or `/quality-init`).
