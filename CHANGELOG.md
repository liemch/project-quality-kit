# Changelog

> Change history for **Project Quality Kit** (Base engine).  
> Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
> Versioning: SemVer aligned with `_meta/versions/engine-version.yml`.

> **Commit rule:** Every PR that changes the engine updates the `[Unreleased]` section here.  
> On release, rename `[Unreleased]` → version + date, bump `engine_version` in `_meta/versions/engine-version.yml` and `package.json`.

## [Unreleased]

### Added

- (none yet)

### Changed

- (none yet)

### Fixed

- (none yet)

---

## [0.1.6] — 2026-08-13

### Added

- (n/a)

### Changed

- **`qc-reporter` merges `qc/results.json` by `qcId`** — partial runs / smoke after upgrade no longer wipe sheet history. Force replace: `QC_RESULTS_REPLACE=1`.
- **`upgrade-quality.sh`**: explicitly never touches `qc/results*`, `test-results/`, `playwright-report/`; logs preserved artifacts after upgrade.

### Fixed

- Clone mất Pass/Fail sau `/quality-upgrade` + smoke — do reporter ghi đè; đã merge.

---

## [0.1.5] — 2026-08-12

### Added

- **CI smoke snippets:** `ci/gitlab/e2e.gitlab-ci.yml`, `verify-base.gitlab-ci.yml`, `ci/github/*.yml` + `ci/README.md`.
- **Ant Design helpers:** `e2e/fixtures/ui/antd.ts` (table, modal, search debounce, select, switch, messages).
- **Auth real:** `docs/auth-real.md`, `e2e/specs/auth.setup.ts`, adapter accepts `E2E_REAL_TOKEN` / `token_env` shortcut.
- **webServer DX:** `PW_SKIP_WEBSERVER`, `PW_WEBSERVER_LOG`, `PW_WEBSERVER_TIMEOUT_MS`, startup log URL.
- **init `--git-remote <url>`:** `git init` (if needed) + `origin` đội; rename Base origin → `upstream-quality-kit`.
- `.gitkeep` for `e2e/pages/` and `playwright/.auth/`.

### Changed

- `playwright.config.ts`: default = **mock only**; real mode = `setup` → `chromium` only (`test:e2e-real --project=chromium`).
- Upgrade refreshes `e2e/fixtures/ui/**`, `auth.setup.ts`, `tsconfig.json`, `.gitignore`, `.gitattributes`, `.env.example`, gitkeeps.
- COOKBOOK / README updated for CI, AntD, auth, webServer env, git-remote.

### Fixed

- Auth real: cookie both `localhost`+`127.0.0.1`; `webBaseURL` + `addInitScript` before navigate (no port-80 bug).
- `qc-reporter` skips write on Base template (smoke không leak `qc/results.json`).
- `qc:run` refuses full-suite when catalog filter missing/empty; remove dead `PW_QC_IDS`.
- `qc:import` priority/sheet filters = exact match (aligned with list/run).
- GitHub smoke workflow: drop missing `package-lock.json` cache path.
- README architecture typo `.ai-review/` → `ai-review/`.
- LF enforcement in `.gitattributes` for `*.ts` / `*.md` / yaml.

---

## [0.1.4] — 2026-08-12

### Added

- **P0** `/quality-qc-implement --sheet … --priority …` batch path + `npm run qc:list`.
- **P0** `/quality-qc-coverage` + `npm run qc:coverage` → `qc/coverage.html` / `qc/coverage.json`.
- **P1** Empty-pass guard in `qc:run` (WARN; `--strict-empty` / `QC_STRICT_EMPTY=1` to refuse).
- **P1** Richer `qc:export`: sheet filter, Script path write-back, **QC Run Summary** sheet.
- **P1** GETTING-STARTED: git init + remote đội cho clone (không dùng remote Base).
- **P2** Fail artifacts: `trace/screenshot/video` retain-on-failure; reporter ghi `attachments`.
- **P2** `e2e/fixtures/factories/seed.ts` (`makeListItem`, `padCode`, `seedMany`).
- **P3** AI-review scaffold: `ai-review/rules`, `prompts`, `ci/*.tpl`, `project/` preserved on upgrade.

### Changed

- `upgrade-quality.sh`: refresh factories + example-crud; AI-review subpaths (preserve `ai-review/project/`); force-sync `qc:*` scripts + package version.
- Playwright default `trace: retain-on-failure`.
- Docs/skills/router updated for coverage + batch.

### Fixed

- `qc:list` / `qc:run` / `qc:export` `--sheet` / `--priority` match **exact** (tránh `Template` khớp `Email template`).
- Empty-pass scanner: detect via `qcId` annotation + body `expect` (không vỡ vì title có `\"`).

---

## [0.1.3] — 2026-08-12

### Added

- Skill **`/quality-qc-implement`** — luồng chính người mới: 1 `TC_*` → agent viết step/assert + chạy → **Pass/Fail hệ thống** (cấm pass giả body trống).
- Docs/skills định hướng lại: import → implement → Pass/Fail; codegen chỉ còn backlog tuỳ chọn.

### Changed

- `GETTING-STARTED.md` §4, `docs/qc-excel-bridge.md`, README/COOKBOOK, router `/quality`, import/codegen/run skills: next-step mặc định là **implement**, không “codegen rồi qc-run stub”.
- `wire-quality-skills.sh` blurb CLAUDE.md thêm `/quality-qc-implement`.
- `upgrade-quality.sh` cũng refresh `GETTING-STARTED.md`, `CHANGELOG.md`, `_meta/project.smoke.yml`.

### Fixed

- (n/a — UX/docs; tránh hiểu nhầm skip/pass giả = nghiệm thu hệ thống)

---

## [0.1.2] — 2026-08-12

### Added

- `_meta/project.smoke.yml` — Base smoke defaults (no init required).
- `scripts/verify-base-template.sh` + `npm run verify:base` — assert Base stays project-neutral.
- `scripts/lib/refuse-base.mjs` + `scripts/lib/load-project-cfg.mjs` — shared guards/config for QC scripts.
- Base mutate guards on `qc:import` (mjs/py), `qc:codegen`, `qc:export`, `add-domain.sh` (same basename rule as `init-quality.sh`).
- `playwright.config.ts` `webServer.gracefulShutdown` to reduce Vite hang after runs.
- `.gitkeep` for `e2e/pages/` and `playwright/.auth/`.
- Docs: Hard rule Base vs clone, maintainer section, skills routing prefers `*-quality` clone.

### Changed

- (see prior history in git)

### Fixed

- QC Excel headers with newlines; codegen `test.fixme`; `qc:run` id prefix (`TC_03.1` vs `TC_03.10`).
