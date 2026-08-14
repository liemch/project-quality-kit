---
name: quality-qc-coverage
description: >
  Build and show QC coverage dashboard (catalog vs stub vs implemented vs last
  Pass/Fail) as qc/coverage.html + qc/coverage.json. Use when the user says
  "/quality-qc-coverage", "/quality coverage", "coverage QC", "bao nhiêu TC đã
  implement", "dashboard testcase", or "xem progress Template sheet".
---

# /quality-qc-coverage — Dashboard stub / implemented / last run (v2)

## Procedure

1. Resolve `KIT_ROOT`.
2. Prefer `qc/catalog.json` (else dashboard vẫn hiện orphan specs / golden).
3. Run:

```bash
cd "$KIT_ROOT"
npm run qc:coverage -- --open
```

4. Report summary + path `qc/coverage.html` (file://).
5. Optional: `npm run qc:list -- --sheet Template --status stub|failed|empty`

## Dashboard v2

- Filters: search / sheet / priority / status / last run / empty-pass only
- Badge **empty-pass** khi `test(...)` không có `expect`
- Cột **Artifacts** link screenshot/trace (relative từ `qc/`); `pruned` nếu file đã xoá
- Orphan specs (có `qcId` nhưng chưa nằm catalog) hiện sheet `(from specs)`

## Notes

- `suspiciousEmpty` = pass giả — ưu tiên `/quality-qc-implement` sửa.
- `qc:run` refresh coverage sau mỗi lần chạy.
- Golden patterns: `docs/qc-golden.md` · `npm run test:e2e:golden`
