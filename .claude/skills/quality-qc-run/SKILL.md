---
name: quality-qc-run
description: >
  Run Playwright tests filtered by QC Testcase ID / priority / group, with
  optional visible browser (headed / observe / UI), then optionally export
  results to Excel. Use when the user says "/quality-qc-run", "/quality qc-run",
  "chạy TC_03.1", "chạy P1 QC", "chạy TC headed", "observe testcase",
  "export kết quả QC", or "qc:export". If the TC is still a stub / not
  implemented, prefer /quality-qc-implement instead of only reporting skip.
---

# /quality-qc-run — Run + export by QC id (kèm chế độ browser)

Agent **phải tự chạy** lệnh — không chỉ đưa lệnh cho user.

**Phạm vi:** chạy lại case **đã** có `test(...)` + assert.  
Case còn `test.fixme` / chưa implement → kết quả **skipped** ≠ hệ thống đúng. Khi đó chuyển **`/quality-qc-implement TC_*`**.

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

1. Resolve `KIT_ROOT`; parse filter + display mode.
2. Nếu user muốn “xem hệ thống đúng sai” mà TC còn stub → **`/quality-qc-implement`**, không chỉ run.
3. Chạy:

```bash
cd "$KIT_ROOT"
npm run qc:run -- --id TC_03.1
npm run qc:run -- --id TC_03.1 --headed
```

4. Export nếu user muốn:

```bash
npm run qc:export
# → qc/results.xlsx (không đè file QC gốc)
```

5. Tóm tắt QC ids: **passed / failed / skipped**.  
   - skipped → nhắc implement  
   - passed → chỉ tin nếu spec có `expect` thật (không body trống)

## See also

- Implement + chạy lần đầu: `/quality-qc-implement`
- Suite không theo QC → `/quality-test`
- `docs/qc-excel-bridge.md`
