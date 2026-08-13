# Project Quality Kit

> **Quality Kit engine** — sibling Playwright E2E + QC Excel (ISC) + skills `/quality*` + CI smoke + AntD helpers + auth-real scaffold.  
> Clone thành `<project>-quality`, init cạnh `api` / `web` / `knowledge-base`.
>
> **Base template** (project-agnostic). Engine: **v0.1.5** · [`CHANGELOG.md`](./CHANGELOG.md)

| Ai | Đọc |
|----|-----|
| 👤 Người mới | **[`GETTING-STARTED.md`](./GETTING-STARTED.md)** |
| 👤 Vận hành | File này + [`COOKBOOK.md`](./COOKBOOK.md) |
| 🤖 Agent | [`.claude/skills/`](./.claude/skills/README.md) |

**Tài liệu thêm:** [QC bridge](./docs/qc-excel-bridge.md) · [Auth real](./docs/auth-real.md) · [CI](./ci/README.md)

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Yêu cầu & Cài đặt](#2-yêu-cầu--cài-đặt)
3. [Quick start](#3-quick-start)
4. [Base vs project clone](#4-base-vs-project-clone)
5. [Kiến trúc](#5-kiến-trúc)
6. [Skills & npm scripts](#6-skills--npm-scripts)
7. [QC Excel](#7-qc-excel)
8. [Harness, AntD, Auth, CI](#8-harness-antd-auth-ci)
9. [Upgrade](#9-upgrade)
10. [House rules](#10-house-rules)
11. [Bản đồ tài liệu](#11-bản-đồ-tài-liệu)

---

## 1. Giới thiệu

Sibling test repo (không nhúng e2e vào git web).

**Hai trụ:**

| Trụ | Luồng |
|-----|--------|
| **QC Excel** | import → `/quality-qc-implement` → Pass/Fail → coverage → export |
| **E2E nền** | harness mock · AntD helpers · smoke CI · auth real (opt-in) · upgrade engine |

```text
/quality-qc-import
/quality-qc-implement --sheet Template --priority High
/quality-qc-coverage
```

---

## 2. Yêu cầu & Cài đặt

| Thành phần | Ghi chú |
|------------|---------|
| Node ≥ 20 | |
| Playwright ^1.61 | init cài Chromium |
| Python ≥ 3.10 | `qc:import:py` fallback |
| Cursor / Claude | `/quality*` |
| Sibling web | FE under test; KB khuyến nghị |

```bash
git clone https://github.com/liemch/project-quality-kit.git my-project-quality
cd my-project-quality
./scripts/init-quality.sh --name "My Project" --code myproj --wire-web-scripts \
  --git-remote git@github.com:org/my-project-quality.git
npm run test:e2e:smoke
```

---

## 3. Quick start

| Tình huống | Làm gì |
|------------|--------|
| Chưa có clone | Clone Base → `/quality-init` |
| Engine mới | `/quality-upgrade` |
| Maintainer Base | `npm run verify:base` |

```bash
./scripts/init-quality.sh --name "My Project" --code myproj --wire-web-scripts
npm run test:e2e:smoke          # /quality-test
# QC: /quality-qc-import → /quality-qc-implement TC_xx.y
```

---

## 4. Base vs project clone

```
<workspace>/
├── <project>-web/
├── <project>-knowledge-base/   ← optional
├── <project>-quality/          ← KIT_ROOT
└── project-quality-kit/        ← Base only
```

| | Base | Clone |
|--|------|-------|
| Config | example + smoke yml | `project.yml` |
| QC / domains | Không | Có |
| Mutating scripts | Từ chối | Cho phép |

`npm run verify:base` trên Base.

---

## 5. Kiến trúc

```
e2e/fixtures/
  core · crud-resource · harness · load-config
  factories/seed.ts · ui/antd.ts · adapters/ · domains/
e2e/specs/smoke/ · auth.setup.ts · qc/
scripts/  init · upgrade · wire · e2e/qc-*
ci/       gitlab + github smoke / verify-base
ai-review/  scaffold (phase 2)
.claude/skills/
```

---

## 6. Skills & npm scripts

| Skill | Việc |
|-------|------|
| `/quality-init` / `wire` / `upgrade` / `status` | Lifecycle |
| `/quality-test` | Smoke (mặc định) / headed / observe / ui |
| `/quality-qc-import` · **`implement`** · `coverage` · `run` · `codegen` | QC |
| `/quality-add-domain` | Domain harness |
| `/quality-ai-review` | Scaffold |

| Script | Việc |
|--------|------|
| `test:e2e:smoke` / `:headed` / `test:e2e-real` | Playwright |
| `qc:import` · `list` · `coverage` · `codegen` · `run` · `export` | QC |
| `verify:base` | Maintainer |

**Env:** `PW_SKIP_WEBSERVER` · `PW_WEBSERVER_LOG` · `PW_WEBSERVER_TIMEOUT_MS` · `PW_OBSERVE` · `E2E_REAL_TOKEN` · `QC_STRICT_EMPTY`

**init flags:** `--wire-web-scripts` · `--git-remote <url>` · `--no-npm-install` · `--dry-run`

---

## 7. QC Excel

```text
/quality-qc-import
/quality-qc-implement --sheet X --priority High
/quality-qc-coverage          → qc/coverage.html
npm run qc:export -- --sheet X
```

Pass cần `expect` thật; empty-pass bị `qc:run` cảnh báo. Fail → `test-results/latest/`.  
Chi tiết: [`docs/qc-excel-bridge.md`](./docs/qc-excel-bridge.md).

---

## 8. Harness, AntD, Auth, CI

### Harness / AntD

```ts
import { antd } from "../fixtures/ui/antd";
import { makeListItem, padCode } from "../factories/seed";

await antd.searchDebounced(page, "00280129");
await expect(antd.tableRows(page)).toHaveCount(1);
```

### Auth real

[`docs/auth-real.md`](./docs/auth-real.md) — `E2E_REAL_TOKEN` hoặc implement `authenticateReal`; `PLAYWRIGHT_MODE=real npm run test:e2e-real`.

### webServer

Playwright tự `npm run dev` FE khi có `web_dir`.  
`PW_SKIP_WEBSERVER=1` nếu FE đã chạy / CI harness-only.  
`PW_WEBSERVER_LOG=1` để xem log Vite.

### CI

[`ci/README.md`](./ci/README.md)

| Job | File |
|-----|------|
| Clone smoke | `ci/gitlab/e2e.gitlab-ci.yml` · `ci/github/e2e.github-actions.yml` |
| Base verify | `ci/gitlab/verify-base.gitlab-ci.yml` · `ci/github/verify-base.github-actions.yml` |

---

## 9. Upgrade

```bash
./scripts/upgrade-quality.sh --from https://github.com/liemch/project-quality-kit.git --ref main
```

Giữ: `project.yml`, domains, specs QC, `qc/input`, `ai-review/project/`, **`qc/results*`**, **`test-results/`**, **`playwright-report/`**.  
Làm mới: scripts, skills, fixtures core/ui/factories, smoke, docs, CI snippets, `auth.setup.ts`.

Smoke / `qc:run` một phần **merge** `qc/results.json` theo `qcId` (không xoá Pass/Fail TC khác). Ghi đè toàn bộ: `QC_RESULTS_REPLACE=1`.

---

## 10. House rules

1. Base không chứa data dự án.  
2. `KIT_ROOT` = clone.  
3. Đổi engine → CHANGELOG + bump version.  
4. Không commit secrets / `.auth/`.  
5. Spec QC phải có `expect` thật.

---

## 11. Bản đồ tài liệu

| File | Nội dung |
|------|----------|
| [GETTING-STARTED.md](./GETTING-STARTED.md) | Từ đầu |
| [COOKBOOK.md](./COOKBOOK.md) | Recipes |
| [docs/qc-excel-bridge.md](./docs/qc-excel-bridge.md) | QC |
| [docs/auth-real.md](./docs/auth-real.md) | Real auth |
| [ci/README.md](./ci/README.md) | CI |
| [CHANGELOG.md](./CHANGELOG.md) | Versions |
| [`.claude/skills/README.md`](./.claude/skills/README.md) | Skills |

---

## License

Internal template — adapt theo policy tổ chức.
