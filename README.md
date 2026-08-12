# Project Quality Kit

> **Quality Kit engine** — scaffold sibling dùng chung (project-agnostic) mang Playwright E2E harness, cầu nối testcase QC Excel (ISC), và chỗ trống cho AI-review / CI. Clone thành `<project>-quality`, init cá nhân hóa, rồi chạy test cạnh `api` / `web` / `knowledge-base`.
>
> **Trạng thái:** đây là bản **Base template** — không chứa config hay data của một dự án cụ thể. Engine hiện tại: **v0.1.3** (`_meta/versions/engine-version.yml`).

> **Hai cửa vào:**
> - 👤 **Người:** file này — giới thiệu, cấu trúc, cách dùng. **Chạy từ đầu?** → [`GETTING-STARTED.md`](./GETTING-STARTED.md).
> - 🤖 **Agent:** [`.claude/skills/`](./.claude/skills/README.md) — skill `/quality*`; chi tiết vận hành trong [COOKBOOK.md](./COOKBOOK.md).
>
> **Muốn đi sâu hơn?**
> - 🚀 [GETTING-STARTED.md](./GETTING-STARTED.md) — hướng dẫn lần đầu: clone → init → smoke → QC.
> - 📖 [COOKBOOK.md](./COOKBOOK.md) — recipes, selector AntD, thêm domain.
> - 🧪 [docs/qc-excel-bridge.md](./docs/qc-excel-bridge.md) — Excel ↔ Playwright (`qcId`).
> - 📜 [CHANGELOG.md](./CHANGELOG.md) — lịch sử engine.

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Yêu cầu & Cài đặt](#2-yêu-cầu--cài-đặt)
3. [Quick start](#3-quick-start)
4. [Base vs project clone](#4-base-vs-project-clone)
5. [Kiến trúc & cấu trúc repo](#5-kiến-trúc--cấu-trúc-repo)
6. [Skills & npm scripts](#6-skills--npm-scripts)
7. [QC Excel bridge](#7-qc-excel-bridge)
8. [E2E harness](#8-e2e-harness)
9. [Upgrade engine](#9-upgrade-engine)
10. [House rules](#10-house-rules)
11. [Bản đồ tài liệu](#11-bản-đồ-tài-liệu)

> **Lần đầu gắn kit?** Đọc [`GETTING-STARTED.md`](./GETTING-STARTED.md) trước, rồi quay lại README khi cần tra cứu.

---

## 1. Giới thiệu

**Kit này là gì:** sibling repo chạy **Playwright** cho một dự án — mock session, domain harness, smoke, và luồng QC Excel (**import → implement TC → Pass/Fail hệ thống** → export). Không nhúng e2e vào git của web; giống mô hình Knowledge Base: **clone → init → chạy**.

**Vì sao tồn tại:**

- Một engine e2e/QC tái sử dụng cho nhiều dự án, không copy-paste harness.
- Agent skills `/quality*` để onboard và vận hành, không bắt user nhớ script.
- **Người mới:** import Excel rồi `/quality-qc-implement TC_*` — agent viết + chạy; không tự sửa `test.fixme`.
- Codegen stub chỉ là backlog tùy chọn; Pass/Fail thật đến từ implement + assert.

**Điểm khác biệt:**

- **Base vs clone** — Base chỉ giữ engine; mọi config/data dự án nằm ở `<project>-quality`.
- **KB-aware init** — đọc sibling knowledge-base để lấy port / base path / service id (optional).
- **QC implement-first** — người mới: import → implement TC → Pass/Fail; codegen stub là backlog phụ.

---

## 2. Yêu cầu & Cài đặt

### 2.1 Yêu cầu

| Thành phần | Version / Ghi chú |
|------------|-------------------|
| **Node** | ≥ 20 |
| **Playwright** | `@playwright/test` ^1.61 (cài qua `npm install` trong clone) |
| **Python** | ≥ 3.10 — fallback `qc:import:py` (openpyxl) khi thiếu npm `xlsx` |
| **Claude Code / Cursor** | Chạy skill `/quality*` |
| **Sibling web** | FE đang test (Vite/React…). KB sibling khuyến nghị nhưng không bắt buộc |

### 2.2 Cài đặt (trong clone dự án)

```bash
git clone <url-project-quality-kit> my-project-quality
cd my-project-quality

./scripts/init-quality.sh --name "My Project" --code myproj --wire-web-scripts
# → config + wire skills + npm install + playwright chromium
npm run test:e2e:smoke
```

> Base template (`project-quality-kit`) **không** chạy `init-quality.sh` in-place. Xem [§4](#4-base-vs-project-clone).
> Skip deps: thêm `--no-npm-install`.
---

## 3. Quick start

**Bạn đang ở tình huống nào?**

- 🆕 **Chưa có `*-quality`** → clone Base → `/quality-init` (hoặc shell bên dưới).
- ♻️ **Đã có clone, muốn engine mới** → `/quality-upgrade`.
- 🧪 **Maintainer Base** → `npm run verify:base` + smoke (không init).

### Onboard dự án — 5 bước

```bash
# 1. Workspace đã có web (+ KB nếu có)
cd /path/to/my-project

# 2. Clone Base → sibling quality
git clone <url-project-quality-kit> my-project-quality
# hoặc: cp -a /path/to/project-quality-kit my-project-quality
cd my-project-quality

# 3. Cá nhân hóa (có KB → tự đọc FE/port; không KB → truyền --web-dir/--port/--base-path)
./scripts/init-quality.sh --name "My Project" --code myproj --wire-web-scripts
# xem trước: thêm --dry-run
# → wire skills + npm install + playwright chromium (mặc định)

# 4. Smoke
npm run test:e2e:smoke

# 5. (Tuỳ chọn) QC Excel — Pass/Fail hệ thống
cp ~/Downloads/ISC_*_TestCase.xlsx qc/input/
npm run qc:import:py
# rồi trong Cursor: /quality-qc-implement TC_xx.y
```

Hoặc trong Cursor/Claude: **`/quality-init`** → hỏi input → dry-run → init → wire skills → npm install → verify.

### Checklist

| Bước | Có KB | Không KB |
|------|:-----:|:--------:|
| Clone `*-quality` | ✓ | ✓ |
| `init` / `/quality-init` | auto FE từ KB | `--web-dir --port --base-path` |
| Wire skills (mặc định ON) | ✓ | ✓ |
| `npm install` + chromium (mặc định ON trong init) | ✓ | ✓ |
| `--wire-web-scripts` | nên bật | nên bật |
| `/quality-test` smoke | ✓ | ✓ |
| (QC) `/quality-qc-import` → `/quality-qc-implement TC_*` | tuỳ | tuỳ |

---

## 4. Base vs project clone

```
<project-workspace>/
├── <project>-api/
├── <project>-web/                 ← app under test
├── <project>-knowledge-base/      ← optional (init đọc FE/port)
├── <project>-quality/             ← clone đã init (chạy test ở đây)
└── project-quality-kit/           ← Base template (upstream only)
```

| | Base `project-quality-kit` | Clone `<project>-quality` |
|--|---------------------------|---------------------------|
| Vai trò | Engine / scaffold upstream | Kit gắn dự án |
| Config | `project.example.yml` + `project.smoke.yml` | `_meta/project.yml` + `project.json` |
| QC / stubs / domains | Không | Có |
| `init` / `qc:import` / `codegen` / `add-domain` | **Từ chối** | Cho phép |
| Smoke | Harness + annotation (mock-ui skip nếu không có web) | Full theo config |

Escape hatch maintainer: `QUALITY_ALLOW_BASE_INIT=1` (chỉ khi test chính script template).

```bash
cd project-quality-kit
npm run verify:base          # assert Base sạch
npm run test:e2e:smoke       # dùng project.smoke.yml
```

---

## 5. Kiến trúc & cấu trúc repo

```
project-quality-kit/                 ← Base (không personalize)
├── README.md                        ← file này
├── CHANGELOG.md
├── COOKBOOK.md
├── package.json
├── playwright.config.ts
├── _meta/
│   ├── project.example.yml          # mẫu cho init
│   ├── project.smoke.yml            # smoke Base (không cần init)
│   └── versions/engine-version.yml
├── e2e/
│   ├── fixtures/                    # core, crud, harness, domains/
│   ├── specs/smoke/                 # smoke examples
│   ├── specs/qc/                    # (clone) *.generated.spec.ts
│   ├── qc/qc-reporter.ts
│   └── pages/
├── qc/input/                        # (clone) đặt Excel QC
├── scripts/
│   ├── init-quality.sh
│   ├── upgrade-quality.sh
│   ├── verify-base-template.sh
│   ├── wire-quality-skills.sh
│   ├── lib/                         # refuse-base, load-project-cfg
│   └── e2e/                         # add-domain, qc-*
├── docs/qc-excel-bridge.md
├── .claude/skills/                  # /quality*
├── ai-review/                       # placeholder phase 2
└── ci/gitlab/                       # placeholder CI
```

| Module | Status | Mục đích |
|--------|--------|----------|
| `e2e/` | **phase 1** | Playwright harness + smoke |
| `qc/` + `scripts/e2e/qc-*` | **phase 1** | Import / codegen / run / export |
| `.claude/skills/` | **phase 1** | Agent skills `/quality*` |
| `ai-review/` | placeholder | AI review CI |
| `ci/` | placeholder | Job GitLab/GitHub |

Sau **clone → init**, clone có thêm `_meta/project.yml` + `project.json` — **không** commit các file đó vào Base.

---

## 6. Skills & npm scripts

### 6.1 Agent skills

Nguồn: `.claude/skills/` → wire ra `<workspace>/.claude/skills/` (init mặc định bật).

| Skill | Việc |
|-------|------|
| `/quality` | Router |
| `/quality-init` | Onboard clone (+ wire skills) |
| `/quality-wire` | (Re)symlink skills |
| `/quality-test` | e2e: smoke / headed / observe / ui / real |
| `/quality-qc-import` | Excel → `qc/catalog.json` |
| `/quality-qc-implement` | **TC → viết test + chạy → Pass/Fail hệ thống** (luồng chính) |
| `/quality-qc-codegen` | Catalog → stub `test.fixme` (backlog, tuỳ chọn) |
| `/quality-qc-run` | Chạy lại TC đã implement (+ headed/observe/ui) |
| `/quality-add-domain` | Scaffold domain harness |
| `/quality-upgrade` | Nâng engine từ upstream |
| `/quality-status` | Xem config web/port/KB |
| `/quality-ai-review` | Phase 2 placeholder |

Chi tiết: [`.claude/skills/README.md`](./.claude/skills/README.md).

### 6.2 npm scripts (trong clone)

| Script | Mô tả |
|--------|--------|
| `npm run test:e2e` | Playwright (mock mặc định) |
| `npm run test:e2e:smoke` | Smoke harness (+ mock-ui nếu có web) |
| `npm run test:e2e:ui` / `:headed` / `:report` | UI / headed / HTML report |
| `npm run test:e2e-real` | `PLAYWRIGHT_MODE=real` |
| `npm run qc:import` / `qc:import:py` | Excel → catalog |
| `npm run qc:codegen` | Catalog → stubs |
| `npm run qc:run` | Lọc theo TC / priority / group |
| `npm run qc:export` | `results.json` → `results.xlsx` |
| `npm run verify:base` | Assert Base sạch (maintainer) |

Biến hữu ích: `PLAYWRIGHT_MODE`, `PW_OBSERVE=1`, `PW_SLOWMO=400`, `PW_LOCALE`, `PW_TZ`, `E2E_REAL_TOKEN`.

### 6.3 `init-quality.sh` — flags chính

| Flag | Ý nghĩa |
|------|---------|
| `--name` / `--code` | Tên + mã dự án |
| `--kb-dir` | KB sibling (bỏ qua auto-discover) |
| `--web-dir` / `--port` / `--base-path` | Override FE |
| `--wire-web-scripts` | Thêm `test:e2e*` / `qc:*` vào web `package.json` |
| `--no-wire-skills` | Không symlink skill (mặc định **có** wire) |
| `--no-npm-install` | Không chạy `npm install` + Playwright Chromium (mặc định **có** install) |
| `--dry-run` | In plan, không ghi file |

---

## 7. QC Excel bridge

Luồng **người mới** (khuyến nghị):

```text
/quality-qc-import
/quality-qc-implement TC_12.1    ← agent viết + chạy → Pass/Fail hệ thống
```

Shell / advanced:

```bash
cp /path/to/ISC_*_TestCase.xlsx qc/input/
npm run qc:import:py
# implement via agent (preferred) or hand-write steps + expect
npm run qc:run -- --id TC_12.1
npm run qc:export
```

Gắn spec với Testcase ID:

```ts
test("TC_01.1 Create resource successfully", async ({ page }) => {
  test.info().annotations.push({ type: "qcId", description: "TC_01.1" });
  // steps + expect — bắt buộc có assert thật
});
```

> Import/codegen **không** kết luận hệ thống đúng/sai. Chỉ `/quality-qc-implement` (hoặc test đã viết tay) mới có Pass/Fail ý nghĩa.
> Chi tiết: [docs/qc-excel-bridge.md](./docs/qc-excel-bridge.md).

Chi tiết: [docs/qc-excel-bridge.md](./docs/qc-excel-bridge.md).

---

## 8. E2E harness

```
e2e/fixtures/
  core.ts              # cookie auth + session mock + CORS
  crud-resource.ts     # mock list/CRUD có state
  harness.ts           # defineDomainHarness(...)
  load-config.ts       # project.yml|json|smoke.yml
  adapters/auth.real.stub.ts
  domains/example-crud.ts
```

Thêm domain:

```bash
./scripts/e2e/add-domain.sh special-term
# sửa domains/special-term.ts → viết specs/
```

| Mode | Cách bật |
|------|----------|
| **cookie-fake** (mặc định) | `PLAYWRIGHT_MODE` unset / `mock` |
| **real** | `PLAYWRIGHT_MODE=real` + implement `auth.real.stub.ts` |

---

## 9. Upgrade engine

Trong **clone** (không phải Base):

```bash
./scripts/upgrade-quality.sh --from /path/to/upstream-project-quality-kit
# hoặc: --from git@…:project-quality-kit.git --ref main
```

| Giữ nguyên (project-owned) | Làm mới từ upstream |
|----------------------------|---------------------|
| `_meta/project.yml` / `project.json` | fixtures core/harness/load-config, adapters, smoke |
| `e2e/fixtures/domains/**` | `scripts/**`, skills, docs, README, COOKBOOK, CHANGELOG |
| `e2e/specs/**` (trừ smoke) | `playwright.config.ts`, `ai-review/**`, `ci/**` |
| `e2e/pages/**`, `qc/input/**`, `qc/catalog.json` | |

Sau upgrade: `/quality-wire` nếu skill symlink lệch.

---

## 10. House rules

1. **Base không chứa data dự án** — không commit `project.yml`, Excel, catalog, generated stubs vào Base.
2. **Day-to-day `KIT_ROOT` = clone `*-quality`** — Base chỉ để clone / upgrade `--from` / `verify:base`.
3. **Đổi behavior engine → cập nhật CHANGELOG `[Unreleased]`** + bump `_meta/versions/engine-version.yml` khi release.
4. **Không commit secrets** (`.env*`, token, cookie thật).
5. **Code app (web/api) là source of truth** cho hành vi UI/API; kit chỉ là lớp test.

---

## 11. Bản đồ tài liệu

| File | Nội dung |
|------|----------|
| [GETTING-STARTED.md](./GETTING-STARTED.md) | **Hướng dẫn chạy từ đầu** (clone → init → smoke → QC) |
| [README.md](./README.md) | Tổng quan engine (file này) |
| [CHANGELOG.md](./CHANGELOG.md) | Lịch sử engine |
| [COOKBOOK.md](./COOKBOOK.md) | Recipes vận hành |
| [docs/qc-excel-bridge.md](./docs/qc-excel-bridge.md) | QC Excel bridge |
| [`.claude/skills/README.md`](./.claude/skills/README.md) | Catalog `/quality*` |
| [ai-review/README.md](./ai-review/README.md) | Phase 2 |
| [ci/gitlab/README.md](./ci/gitlab/README.md) | CI fragments |

---

## License

Internal template — adapt theo policy tổ chức.
