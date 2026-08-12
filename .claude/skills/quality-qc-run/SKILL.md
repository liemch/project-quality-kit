---
name: quality-qc-run
description: >
  Run Playwright tests filtered by QC Testcase ID / priority / group, with
  optional visible browser (headed / observe / UI), then optionally export
  results to Excel. Use when the user says "/quality-qc-run", "/quality qc-run",
  "chạy TC_03.1", "chạy P1 QC", "chạy TC headed", "observe testcase",
  "export kết quả QC", or "qc:export".
---

# /quality-qc-run — Run + export by QC id (kèm chế độ browser)

Agent **phải tự chạy** lệnh — không chỉ đưa lệnh cho user.

## Prerequisites

- Catalog: `qc/catalog.json` — else `/quality-qc-import` first.
- Specs annotate `qcId` (và nên có `TC_*` trong title).

## Filters

`--id TC_03.1` | `--priority High` | `--group Functional` | `--grep …`

## Display modes (giống /quality-test)

| User nói | Flag thêm | Browser hiện? |
|----------|-----------|---------------|
| (mặc định) | — | Không (headless) |
| headed / mở trình duyệt | `--headed` | **Có** |
| observe / chậm / full-screen | `--observe` | **Có** (PW_OBSERVE + slowMo 400) |
| ui / debug | `--ui` | **Có** (Playwright UI) |

## Procedure

1. Resolve `KIT_ROOT`; parse filter + display mode (hỏi nếu user muốn “xem” mà chưa nói headed/observe/ui).
2. Chạy:

```bash
cd "$KIT_ROOT"
npm run qc:run -- --id TC_03.1
npm run qc:run -- --id TC_03.1 --headed
npm run qc:run -- --priority High --observe
npm run qc:run -- --id TC_03.1 --ui
```

3. Export nếu user muốn ghi Excel:

```bash
npm run qc:export
# → qc/results.xlsx (không đè file QC gốc)
```

4. Tóm tắt QC ids pass/fail.

## See also

- Suite không theo QC → `/quality-test`
- `docs/qc-excel-bridge.md`
