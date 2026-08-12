---
name: quality
description: >
  Router for Project Quality Kit (Playwright e2e + QC Excel bridge). Use when the
  user says "/quality", "init quality kit", "setup e2e sibling", "quality init",
  "chạy quality", "cài bộ e2e", "import testcase QC", or asks how to onboard a
  project that does not have *-quality yet. Prefer this over telling the user to
  run scripts/*.sh manually. Subcommands: init | wire | upgrade | test | smoke |
  headed | observe | ui | qc-import | qc-codegen | qc-run | add-domain | status | ai-review.
---

# /quality — Project Quality Kit router

Sibling kit (next to api/web/kb) — same mental model as Knowledge Base skills.
**Prefer driving the agent skill; shell scripts are the engine underneath.**

## Resolve kit root first

Walk up from cwd for `_meta/project.yml` or `_meta/project.json`.  
If missing, look for a sibling directory under the workspace parent:

- `*-quality/` (preferred — project clone)
- `project-quality-kit/` (**Base only** — for `/quality-init` clone step or `/quality-upgrade --from`; do **not** run import/codegen/add-domain here)

If still missing → **first-time onboard**: follow **init**. Do not invent a kit path.

`KIT_ROOT` for day-to-day work = the `<project>-quality` clone. Sub-skills run with awareness of `KIT_ROOT`.

## Route by user intent

| User says / wants | Subcommand | Follow skill |
|-------------------|------------|--------------|
| init / setup / onboard / dự án chưa có | `init` | [`quality-init`](../quality-init/SKILL.md) |
| wire skills vào workspace | `wire` | [`quality-wire`](../quality-wire/SKILL.md) |
| upgrade engine | `upgrade` | [`quality-upgrade`](../quality-upgrade/SKILL.md) |
| chạy test / smoke | `test` / `smoke` | [`quality-test`](../quality-test/SKILL.md) |
| mở trình duyệt / headed | `headed` | [`quality-test`](../quality-test/SKILL.md) → mode `headed` |
| observe / chậm / full-screen | `observe` | [`quality-test`](../quality-test/SKILL.md) → mode `observe` |
| UI Mode / time-travel debug | `ui` | [`quality-test`](../quality-test/SKILL.md) → mode `ui` |
| import Excel QC | `qc-import` | [`quality-qc-import`](../quality-qc-import/SKILL.md) |
| sinh stub từ catalog / codegen | `qc-codegen` | [`quality-qc-codegen`](../quality-qc-codegen/SKILL.md) |
| chạy theo TC / P1 / TC headed|observe | `qc-run` | [`quality-qc-run`](../quality-qc-run/SKILL.md) |
| thêm domain CRUD | `add-domain` | [`quality-add-domain`](../quality-add-domain/SKILL.md) |
| status / config | `status` | [`quality-status`](../quality-status/SKILL.md) |
| AI review CI | `ai-review` | [`quality-ai-review`](../quality-ai-review/SKILL.md) (phase 2) |

If the user only says `/quality` → show this menu (VI+EN) and ask which subcommand.

**Always `Read` the target skill’s `SKILL.md` and follow it** — do not re-implement from memory.

## Hard rules

1. Do **not** only paste a shell command and stop — orchestrate (ask → run → verify → next steps).
2. Scripts are source of truth for writes (`init-quality.sh`, `wire-quality-skills.sh`, `upgrade-quality.sh`, `qc-*.mjs`).
3. Never commit secrets (`E2E_REAL_TOKEN`, `.auth/`, credential-bearing Excel).
4. Project specs/domains/`_meta/project.yml` live in the **quality** repo.

## Related

- Human docs: `README.md` §2 + § Skills, `COOKBOOK.md`, `docs/qc-excel-bridge.md`
