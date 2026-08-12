---
name: quality-qc-coverage
description: >
  Build and show QC coverage dashboard (catalog vs stub vs implemented vs last
  Pass/Fail) as qc/coverage.html + qc/coverage.json. Use when the user says
  "/quality-qc-coverage", "/quality coverage", "coverage QC", "bao nhiêu TC đã
  implement", "dashboard testcase", or "xem progress Template sheet".
---

# /quality-qc-coverage — Dashboard stub / implemented / last run

## Procedure

1. Resolve `KIT_ROOT`.
2. Need `qc/catalog.json` (else `/quality-qc-import` first).
3. Run:

```bash
cd "$KIT_ROOT"
npm run qc:coverage -- --open
```

4. Report summary numbers to user + path `qc/coverage.html` (file://).
5. Optional: `npm run qc:list -- --sheet Template --status stub` for backlog.

## Notes

- `suspiciousEmpty` = `test(...)` không có `expect` — pass giả; ưu tiên `/quality-qc-implement` sửa.
- `qc:run` cũng refresh coverage sau mỗi lần chạy.
