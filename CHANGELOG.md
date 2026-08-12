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

## [0.1.3] — 2026-08-12

### Added

- Skill **`/quality-qc-implement`** — luồng chính người mới: 1 `TC_*` → agent viết step/assert + chạy → **Pass/Fail hệ thống** (cấm pass giả body trống).
- Docs/skills định hướng lại: import → implement → Pass/Fail; codegen chỉ còn backlog tuỳ chọn.

### Changed

- `GETTING-STARTED.md` §4, `docs/qc-excel-bridge.md`, README/COOKBOOK, router `/quality`, import/codegen/run skills: next-step mặc định là **implement**, không “codegen rồi qc-run stub”.
- `wire-quality-skills.sh` blurb CLAUDE.md thêm `/quality-qc-implement`.

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

- `e2e/fixtures/load-config.ts` — discover Base via `project.smoke.yml`; type includes `features.wire_skills`.
- `e2e/specs/smoke/mock-ui.example.spec.ts` — skip when `web_dir` missing on disk (Base-safe).
- `.gitignore` — ignore clone-owned `qc/catalog.json`, `qc/coverage.json`, `*.generated.spec.ts`.
- Soften `project.example.yml` placeholders (`demo-web`, `/app`).
- Engine pin `0.1.2`; Base `initialized_at: null`.

### Fixed

- `qc-run` `--id TC_x.y` no longer prefix-matches `TC_x.y0` (negative lookahead `(?!\d)`).
- `qc-codegen` `stubbedCount` no longer double-counts on re-run (rescan after write).
- `qc-export` loads `project.json` (not only `project.yml`); Excel header normalize parity with import.
- `qc-import.mjs` prints by-group counts; shared config loader; refuse Base before requiring `xlsx`.

---

## [0.1.1] — 2026-08-12

### Added

- Agent skills catalog `/quality*` under `.claude/skills/` + `scripts/wire-quality-skills.sh`.
- `init-quality.sh` wires skills into workspace by default (`--no-wire-skills` to skip).
- `qc:codegen` — Level A stubs (`test.fixme` + `qcId` + Pre/Steps/Expected) from `qc/catalog.json`.
- Skill `/quality-qc-codegen`; router + README wiring.
- Init refuses basename `project-quality-kit` unless `QUALITY_ALLOW_BASE_INIT=1`.

### Changed

- Docs: QC workflow import → codegen → implement → run → export.
- Engine pin `0.1.1`.

### Fixed

- `qc-import` header normalize for Excel newlines / trailing `(hint)` (mjs + py).
- `add-domain.sh` — write domain file via Python (avoid bash expanding `${}` in template).

---

## [0.1.0] — 2026-08-12

### Added

- Initial scaffold: Playwright e2e harness (`core` / `crud-resource` / `harness` / domain example).
- `init-quality.sh` — personalize clone from sibling KB (optional) or explicit web flags.
- `upgrade-quality.sh` — refresh engine while preserving project-owned artifacts.
- QC Excel bridge stubs: `qc:import`, `qc:run`, `qc:export` (+ Python import fallback).
- Smoke specs: harness-only, mock-ui example, qc-annotation example.
- Placeholders: `ai-review/`, `ci/gitlab/`.
- Bilingual README + COOKBOOK + `docs/qc-excel-bridge.md`.
- Engine pin `0.1.0`.
