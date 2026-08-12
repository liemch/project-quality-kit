# Quality Kit — Agent skills

Source of truth for Cursor/Claude skills. `init-quality.sh` / `wire-quality-skills.sh` symlink these into the **workspace** `.claude/skills/` so `/quality*` works from the multi-repo root.

| Skill | Command | Purpose |
|-------|---------|---------|
| `quality` | `/quality` | Router |
| `quality-init` | `/quality-init` | Onboard kit vào dự án (+ wire skills) |
| `quality-wire` | `/quality-wire` | (Re)symlink skills → workspace |
| `quality-upgrade` | `/quality-upgrade` | Nâng cấp engine từ upstream |
| `quality-test` | `/quality-test` | Chạy e2e: smoke / headed / observe / ui / real |
| `quality-qc-import` | `/quality-qc-import` | Excel QC → catalog |
| `quality-qc-codegen` | `/quality-qc-codegen` | Catalog → `test.fixme` stubs (Level A) |
| `quality-qc-run` | `/quality-qc-run` | Chạy theo TC + `--headed`/`--observe`/`--ui` |
| `quality-add-domain` | `/quality-add-domain` | Scaffold domain harness |
| `quality-status` | `/quality-status` | Xem config |
| `quality-ai-review` | `/quality-ai-review` | Phase 2 placeholder |

Engine scripts (called by skills): `scripts/init-quality.sh`, `scripts/wire-quality-skills.sh`, `scripts/upgrade-quality.sh`, `scripts/verify-base-template.sh`, `scripts/e2e/qc-*.mjs`, `scripts/e2e/add-domain.sh`.

Hard rule: day-to-day `KIT_ROOT` is the `<project>-quality` clone. Base `project-quality-kit` is upstream only (`/quality-init` clone source, `/quality-upgrade --from`).