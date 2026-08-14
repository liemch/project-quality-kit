---
name: quality-qc-run
description: >
  Run Playwright tests filtered by QC Testcase ID / sheet / priority / group, with
  optional visible browser (headed / observe / UI), then optionally export
  results to Excel. Use when the user says "/quality-qc-run", "/quality qc-run",
  "chạy TC_03.1", "chạy P1 QC", "chạy sheet Template", "chạy TC headed",
  "observe testcase", "export kết quả QC", or "qc:export". If the TC is still a
  stub, prefer /quality-qc-implement.
---

# /quality-qc-run — Run + export by QC id

Agent **phải tự chạy** lệnh.

**Phạm vi:** case **đã** `test(...)` + assert. Stub → chuyển `/quality-qc-implement`.

## Filters

`--id TC_03.1` | `--sheet Template` | `--priority High` | `--group Functional` | `--grep …`  
`--status stub|implemented|missing|failed|passed|skipped|empty`  
`--dry-run` — list matched ids, **không** chạy Playwright  
`--project mock` (default) · `--slowmo N` · passthrough args after flags

Catalog filters require `qc/catalog.json` (trừ `--status failed|passed|…` có thể dùng results/scan). Empty match → exit 1.

## Display

| Flag | Browser |
|------|---------|
| (default) | headless |
| `--headed` | visible |
| `--observe` | visible + slowMo |
| `--ui` | Playwright UI |

## Empty-pass guard

Implemented specs without `expect` → WARN. Refuse with `--strict-empty` or `QC_STRICT_EMPTY=1`. Bypass: `--allow-empty`.

## Procedure

```bash
cd "$KIT_ROOT"
npm run qc:run -- --id TC_03.1
npm run qc:run -- --sheet Template --priority High --headed
npm run qc:run -- --status failed              # re-run last Fail
npm run qc:run -- --status stub --dry-run      # list only
npm run qc:wave-report -- --sheet Template
npm run qc:export -- --sheet Template
npm run qc:coverage -- --open
```

Fail → trỏ attachments trong `qc/results.json` (nằm ở `test-results/run-<timestamp>/`, shortcut `test-results/latest/`).
`attachmentsMissing: true` = artifact của run cũ đã bị prune (`PW_KEEP_RUNS`), chạy lại TC đó để có artifact mới.

## See also

- `/quality-qc-implement` · `/quality-qc-coverage` · `docs/qc-excel-bridge.md` · `docs/qc-implement-report.md`
