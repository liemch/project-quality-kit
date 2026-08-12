---
name: quality-qc-import
description: >
  Import ISC QC Excel testcases into qc/catalog.json for the Project Quality Kit.
  Use when the user says "/quality-qc-import", "/quality qc-import", "import
  testcase QC", "import Excel TC", or provides an ISC_*_TestCase.xlsx path.
---

# /quality-qc-import — Excel → catalog

## Procedure

1. Resolve `KIT_ROOT`.
2. Locate Excel:
   - path from user, or
   - first `qc/input/*.xlsx`, or
   - ask user to place file / provide path
3. Optional filters: `--priority High`, `--group Functional`, `--sheet "…"`.
4. Run:

```bash
cd "$KIT_ROOT"
# Prefer Python fallback when npm `xlsx` is missing:
npm run qc:import:py -- --file "$XLSX"
# or: npm run qc:import -- --file "$XLSX"
```

5. Report: total cases, counts by priority/group/sheet (from catalog or script stdout).
6. Next steps: `/quality-qc-codegen` (stubs) → implement → `/quality-qc-run`.

## Notes

- Import does **not** auto-generate runnable Playwright specs (use codegen for Level A stubs).
- Refuse to run inside Base `project-quality-kit` — work in the `<project>-quality` clone.
- See `docs/qc-excel-bridge.md`.
