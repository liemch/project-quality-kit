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
