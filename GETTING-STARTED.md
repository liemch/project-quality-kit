# Hướng dẫn chạy từ đầu — Project Quality Kit

> Dành cho lần **đầu tiên** gắn Quality Kit vào một workspace dự án.  
> Làm lần lượt các bước dưới đây. Chi tiết kỹ thuật: [README.md](./README.md), [COOKBOOK.md](./COOKBOOK.md).

---

## 0. Chuẩn bị

| Cần có | Ghi chú |
|--------|---------|
| Node.js ≥ 20 | `node -v` |
| Git | |
| Workspace dự án | đã có (hoặc sắp có) `*-web`; nên có `*-knowledge-base` |
| Cursor / Claude Code | để dùng skill `/quality*` (tuỳ chọn, khuyến nghị) |

Cấu trúc workspace mục tiêu:

```
my-project/                          ← workspace root
├── my-project-web/                  ← FE under test
├── my-project-api/                  ← optional
├── my-project-knowledge-base/       ← nên có (init tự đọc port/base)
└── my-project-quality/              ← sẽ tạo ở bước 1 (clone)
```

> **Không** chạy `init` trong folder tên `project-quality-kit` (đó là Base template).

---

## 1. Clone Base → sibling quality

```bash
cd /path/to/my-project

git clone https://github.com/liemch/project-quality-kit.git my-project-quality
cd my-project-quality
```

Tên folder nên theo pattern `<project>-quality` (vd `fti-agreement-management-quality`).

---

## 2. Init (config + skills + npm)

### Có Knowledge Base sibling (khuyến nghị)

```bash
./scripts/init-quality.sh \
  --name "My Project" \
  --code myproj \
  --wire-web-scripts
```

Script sẽ:

1. Tự tìm KB → đọc web/port/base-path  
2. Ghi `_meta/project.yml` + `project.json`  
3. Wire skill `/quality*` vào `<workspace>/.claude/skills/` + blurb `CLAUDE.md`  
4. Chạy `npm install` + `npx playwright install chromium`  
5. (Nếu `--wire-web-scripts`) thêm script tiện vào `package.json` của web  

### Không có KB — truyền tay FE

```bash
./scripts/init-quality.sh \
  --name "My Project" \
  --code myproj \
  --web-dir ../my-project-web \
  --port 5173 \
  --base-path / \
  --wire-web-scripts
```

### Xem plan trước khi ghi

```bash
./scripts/init-quality.sh --name "My Project" --code myproj --dry-run
```

### Flags thường dùng

| Flag | Ý nghĩa |
|------|---------|
| `--wire-web-scripts` | Thêm `test:e2e*` / `qc:*` vào web |
| `--no-wire-skills` | Không symlink skill |
| `--no-npm-install` | Không `npm install` / Chromium (CI đã có sẵn) |

### Hoặc dùng agent

Trong Cursor/Claude (cwd bất kỳ trong workspace):

```text
/quality-init
```

Agent hỏi input → dry-run → chạy `init-quality.sh` giúp bạn.

---

## 3. Kiểm tra init thành công

Trong Cursor / Claude (cwd bất kỳ trong workspace):

```text
/quality-status
/quality-test
```

- `/quality-status` — kit root, `project.yml`, web/port/base, skill đã wire chưa  
- `/quality-test` — **chạy smoke ngay** (không hỏi mode). Mode khác: `/quality headed`, `/quality observe`, `/quality ui`

Kỳ vọng smoke: harness + qc-annotation **pass**; mock-ui pass nếu web sibling chạy được (webServer auto start).

Không dùng agent? Kiểm tra tay trong clone:

```bash
# Đang ở my-project-quality/
test -f _meta/project.yml && echo "OK project.yml"
ls ../.claude/skills/quality* | head
npm run test:e2e:smoke
```

---

## 4. (Tuỳ chọn) QC Excel — xem hệ thống đúng/sai

**Mục tiêu người mới:** import Excel → implement TC (1 cái hoặc cả sheet) → Pass/Fail.

```text
/quality-qc-import
/quality-qc-implement TC_12.1
# hoặc cả sheet P1:
/quality-qc-implement --sheet Template --priority High
/quality-qc-coverage
```

| Bước | Skill | Anh nhận được |
|------|-------|----------------|
| 1 | `/quality-qc-import` | Catalog — **chưa** kiểm hệ thống |
| 2 | `/quality-qc-implement …` | Agent viết + chạy → **Pass / Fail / Skip** |
| 3 | `/quality-qc-coverage` | Dashboard `qc/coverage.html` |
| 4 | `/quality-qc-run` / `qc:export` | Chạy lại / Excel `qc/results.xlsx` (có sheet **QC Run Summary**) |

Anh **không** cần tự sửa `test.fixme`. `qc:run` cảnh báo **empty-pass** (test không có `expect`).

Fail: xem `test-results/` (screenshot / video / trace — `retain-on-failure`).

Chi tiết: [docs/qc-excel-bridge.md](./docs/qc-excel-bridge.md).

---

## 5. Viết e2e thật cho domain

```bash
./scripts/e2e/add-domain.sh special-term
# sửa e2e/fixtures/domains/special-term.ts  (url, API path, functionCode)
# tạo e2e/specs/....spec.ts
npm run test:e2e
```

Hoặc: `/quality-add-domain special-term`.

Recipes selector Ant Design: [COOKBOOK.md](./COOKBOOK.md).

---

## 6. Chạy test hằng ngày

**Luôn `cd` vào clone** (hoặc nhờ skill — skill tự resolve clone):

| Việc | Shell | Skill |
|------|-------|-------|
| Smoke | `npm run test:e2e:smoke` | `/quality-test` |
| Headed | `npm run test:e2e:headed` | `/quality headed` |
| Observe (chậm, full screen) | `PW_OBSERVE=1 PW_SLOWMO=400 npm run test:e2e:headed` | `/quality observe` |
| UI Mode | `npm run test:e2e:ui` | `/quality ui` |
| Theo TC / sheet | `npm run qc:run -- --id TC_01.1` | `/quality-qc-run` |
| Coverage | `npm run qc:coverage` | `/quality-qc-coverage` |
| Config đang trỏ đâu | — | `/quality-status` |

Nếu đã `--wire-web-scripts`, từ web cũng gọi được `npm run test:e2e:smoke` (script chuyển sang kit quality).

---

## 7. Commit clone dự án (git riêng — khuyến nghị)

Clone **không** dùng chung remote với Base. Mỗi dự án một repo `*-quality` để giữ specs đã implement.

```bash
cd my-project-quality

# Nếu chưa phải git repo (copy tay / chưa init):
git init
git add .
git commit -m "chore: init quality kit for My Project"

# Remote đội (KHÔNG trỏ về project-quality-kit Base):
git remote add origin <git-url-repo-quality-của-đội>
git branch -M main
git push -u origin main
```

Nếu clone từ Base bằng `git clone` rồi đổi remote:

```bash
git remote rename origin upstream-quality-kit   # optional keep
git remote add origin <git-url-repo-quality-của-đội>
git push -u origin main
```

**Nên commit:** `_meta/project.yml`, `e2e/fixtures/domains/**`, specs đã implement, (tuỳ team) `qc/catalog.json`.  
**Không commit:** secrets, `.auth/`, `node_modules/`, file Excel có credential.  
**Không** push data dự án lên Base `project-quality-kit`.

---

## 8. Nâng cấp engine sau này

Khi Base upstream có bản mới:

```bash
cd my-project-quality
./scripts/upgrade-quality.sh --from https://github.com/liemch/project-quality-kit.git --ref main
# hoặc: /quality-upgrade
./scripts/wire-quality-skills.sh   # nếu symlink skill lệch
```

Project-owned (domains, specs, `project.yml`, `qc/input`) được giữ; engine/scripts/skills được làm mới.

---

## 9. Checklist một trang

- [ ] Workspace có `*-web` (+ KB nếu có)  
- [ ] Clone Base → `<project>-quality`  
- [ ] `./scripts/init-quality.sh --name … --code … --wire-web-scripts`  
- [ ] `/quality-test` (smoke) xanh  
- [ ] Trong Cursor thấy `/quality`, `/quality-qc-implement`, …  
- [ ] (QC) Excel → `/quality-qc-import` → `/quality-qc-implement TC_*` → Pass/Fail  
- [ ] (Tuỳ chọn) `add-domain` + viết spec  
- [ ] Push clone lên remote đội  

---

## 10. Lỗi thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| `Refusing to initialize the Base template` | Đang đứng trong `project-quality-kit` — clone ra `<project>-quality` rồi init |
| `Cannot find kit root` / thiếu `project.yml` | Chưa init, hoặc cwd không phải clone |
| Smoke treo sau khi pass | Vite webServer đôi khi chậm tắt — đợi / kill port FE; Base đã có `gracefulShutdown` |
| `npm install` fail trong init | Sửa mạng/registry rồi `npm install && npx playwright install chromium` tay; hoặc init lại không dùng `--no-npm-install` sau khi mạng ổn |
| Skill `/quality*` không hiện | `./scripts/wire-quality-skills.sh` hoặc `/quality-wire` |
| `--id TC_03.1` chạy nhầm TC_03.10… | Đã fix ở engine ≥ 0.1.2; upgrade clone nếu bản cũ |
| `qc:run` → **skipped** | Case còn `test.fixme` — dùng `/quality-qc-implement TC_*`, không kết luận hệ thống |
| Pass nhưng không assert | Pass giả — skill implement cấm; phải có `expect` thật |

---

## Liên kết

| File | Khi nào đọc |
|------|-------------|
| [README.md](./README.md) | Tổng quan engine |
| [COOKBOOK.md](./COOKBOOK.md) | Recipes, AntD selectors |
| [docs/qc-excel-bridge.md](./docs/qc-excel-bridge.md) | Chi tiết QC Excel |
| [CHANGELOG.md](./CHANGELOG.md) | Version engine |
| [`.claude/skills/README.md`](./.claude/skills/README.md) | Catalog skill |
