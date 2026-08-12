---
name: quality-qc-implement
description: >
  Primary newbie path: take one QC Testcase ID — or a sheet/priority wave —
  from catalog, write real Playwright tests (steps + assertions), run them, and
  report Pass/Fail for the system under test. Use when the user says
  "/quality-qc-implement", "/quality implement", "implement TC_12.1",
  "implement sheet Template", "implement P1 Template", "viết test cho TC",
  "chạy testcase Excel xem hệ thống đúng sai", "automate TC", "làm hết sheet",
  or after import when they want to verify the app against QC cases.
---

# /quality-qc-implement — Excel TC → test thật → Pass/Fail hệ thống

Đây là **luồng chính cho người mới**:

```text
Import Excel xong → /quality-qc-implement TC_xx.y → agent viết + chạy → Pass/Fail
```

Batch (cả sheet / P1):

```text
/quality-qc-implement --sheet Template --priority High
```

Người dùng **không** cần tự mở file đổi `test.fixme` → `test`. Agent làm giúp.

Agent **phải tự implement + chạy** — không chỉ bảo user sửa tay / gõ `npm run …`.

## Mental model

| Bước | Skill | Ý nghĩa |
|------|-------|---------|
| Import | `/quality-qc-import` | Catalog — chưa kiểm hệ thống |
| **Implement** | **`/quality-qc-implement`** | Viết step + assert + chạy → **Pass/Fail** |
| Coverage | `/quality-qc-coverage` hoặc `npm run qc:coverage` | Dashboard `qc/coverage.html` |
| Chạy lại | `/quality-qc-run` | Case đã implement |
| Export | `npm run qc:export` | `qc/results.xlsx` (+ sheet QC Run Summary) |

## Prerequisites

1. Resolve `KIT_ROOT` (`*-quality` clone — không Base).
2. `qc/catalog.json` — else `/quality-qc-import`.
3. Filter từ user: `--id TC_*` **hoặc** `--sheet` / `--priority` / `--group`. Nếu thiếu hết → hỏi (gợi ý High stubs).
4. Web sibling / mock harness theo `_meta/project.yml`.

## Resolve wave (batch)

```bash
cd "$KIT_ROOT"
# Liệt kê stub cần làm (JSON cho agent)
npm run qc:list -- --sheet Template --priority High --status stub --json
```

- Không có `--id` nhưng có sheet/priority → **wave**: implement tuần tự các stub (và suspiciousEmpty) trong list.
- Mặc định nếu user chỉ nói “implement Template” mà không nói priority → ưu tiên **`--priority High`**, hỏi trước khi làm Medium/Low.
- Dừng sớm nếu webServer/infra gãy.

## Procedure (mỗi TC)

### 1. Load case từ catalog / qc:list

### 2. Stub file nếu thiếu

```bash
npm run qc:codegen -- --id TC_12.1
```

### 3. Implement thật — Hard rules

1. `test.fixme` → `test` **chỉ khi** đã có step.
2. **Bắt buộc** ≥1 `expect(...)` meaningful. Cấm `void page`, `expect(true)`, chỉ match `TC_*`.
3. Map Pre-condition / Steps / Expected từ Excel.
4. Tái dùng domain harness; seed qua `e2e/fixtures/factories/seed.ts` (`makeListItem`, `padCode`) khi cần list/search.
5. Đọc KB / web source khi cần URL, label, filter API.
6. Mock mặc định; `real` chỉ khi user xin.
7. Thiếu data/external → giữ `fixme`, báo blocker (không Pass).

### 4. Chạy

```bash
npm run qc:run -- --id TC_12.1
# headed: --headed
# wave đã impl: npm run qc:run -- --sheet Template --priority High
```

`qc:run` cảnh báo **empty-pass**; CI có thể `QC_STRICT_EMPTY=1`.

### 5. Báo cáo

| Kết quả | Nói với user |
|---------|--------------|
| passed + assert thật | **Pass** |
| failed | **Fail** + lỗi + `test-results/` (screenshot/video/trace) |
| skipped / blocker | Chưa kiểm được |

**Batch:** bảng markdown `TC_* | Pass/Fail/Skip | note` + `npm run qc:coverage` + gợi ý `npm run qc:export -- --sheet Template`.

## See also

- `/quality-qc-coverage` — dashboard
- `/quality-qc-run` — chạy lại
- `/quality-qc-codegen` — chỉ khung
- `docs/qc-excel-bridge.md`
