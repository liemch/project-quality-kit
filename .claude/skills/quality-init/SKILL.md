---
name: quality-init
description: >
  Onboard / personalize Project Quality Kit for a project that does not have it
  yet (or re-init config). Use when the user says "/quality init", "/quality-init",
  "setup e2e kit", "cài quality cho dự án", "init quality", "bootstrap playwright
  sibling", or describes a workspace that has web/kb but no *-quality. Drives
  scripts/init-quality.sh (wires agent skills by default) — do not only paste
  the shell command for the user to run.
---

# /quality-init — Onboard Project Quality Kit

Mirrors KB’s `/kb-init`: **clone (if needed) → ask inputs → run `init-quality.sh` → wire skills → npm install + chromium → verify → next steps**.

> Prerequisite for personalize-in-place: path is a quality-kit clone containing `scripts/init-quality.sh`. If the workspace has no kit yet, clone/copy the template first (Step 0).

## Step 0 — Ensure a kit directory exists

Workspace parent = directory that already holds `*-web` / `*-knowledge-base`.

1. If `<project>-quality/` exists → use it as `KIT_ROOT`.
2. If only `project-quality-kit/` exists → it is the **Base template**. Clone/copy it to `<project>-quality`; never initialize it in place.
3. Otherwise ask: `git clone <template-url> <project>-quality` or copy from a local template path.
4. Never invent kit files from scratch.

Hard rule: `project-quality-kit` contains engine/examples only. Project config, QC
catalogs, Excel files, generated stubs, domains, and real specs belong in the
`<project>-quality` clone.

## Step 1 — Collect inputs

| Field | Flag | Required | Notes |
|-------|------|----------|-------|
| Project name | `--name` | yes | |
| Project code | `--code` | yes | uppercased by script |
| Wire web scripts? | `--wire-web-scripts` | ask (default yes) | npm stubs on FE |
| Wire skills? | default **ON** | ask only if user wants off | use `--no-wire-skills` to skip |
| npm install? | default **ON** | ask only if user wants off | use `--no-npm-install` to skip |
| KB / web / port / base | as needed | if no KB | auto from KB when present |

## Step 2 — Dry-run then real init

```bash
cd "$KIT_ROOT"
./scripts/init-quality.sh --name "…" --code "…" [--wire-web-scripts] --dry-run
# show plan (includes wire_skills + npm_install) → on approve:
./scripts/init-quality.sh --name "…" --code "…" [--wire-web-scripts]
```

Init **automatically**:

1. `scripts/wire-quality-skills.sh` (unless `--no-wire-skills`)
2. `npm install` + `npx playwright install chromium` (unless `--no-npm-install`)

## Step 3 — Smoke (offer)

```bash
npm run test:e2e:smoke
# or /quality-test
```

## Step 4 — Verify

1. `_meta/project.yml` + `project.json`; `paths.web_dir` exists  
2. `features.wire_skills: true` (unless skipped)  
3. Workspace has symlinks: `.claude/skills/quality`, `quality-init`, `quality-test`, …  
4. `CLAUDE.md` contains `<!-- BEGIN: quality-kit-skills -->` when present  
5. If `--wire-web-scripts`: web `package.json` has `test:e2e*`  
6. `node_modules/@playwright/test` exists (unless `--no-npm-install`)  

If skills missing → run `/quality-wire` (or `./scripts/wire-quality-skills.sh`).

## Step 5 — Reply

```
**Quality kit:** <KIT_ROOT>
**Web:** …  **KB:** …
**Wire:** web_scripts=…  skills=…  npm_install=…
**Skills linked:** /quality /quality-init /quality-test /quality-qc-* …

Next:
  - /quality-test (smoke)
  - /quality-qc-import (Excel)
  - /quality-add-domain <slug>
```

## See also

- Router: [`../quality/SKILL.md`](../quality/SKILL.md)
- Wire only: [`../quality-wire/SKILL.md`](../quality-wire/SKILL.md)
- Engine: `scripts/init-quality.sh`, `scripts/wire-quality-skills.sh`
