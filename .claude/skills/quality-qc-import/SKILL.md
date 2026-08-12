---
name: quality-qc-import
description: >
  Import ISC QC Excel testcases into qc/catalog.json for the Project Quality Kit.
  Use when the user says "/quality-qc-import", "/quality qc-import", "import
  testcase QC", "import Excel TC", or provides an ISC_*_TestCase.xlsx path.
---

# /quality-qc-import — Excel → catalog

Import **chỉ** đưa mô tả TC vào `qc/catalog.json`.  
**Không** trả lời hệ thống đúng/sai. Bước tiếp theo cho người mới: **`/quality-qc-implement TC_*`**.

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
6. **Next step (bắt buộc nói rõ):**

```text
/quality-qc-implement TC_xx.y
```

Ví dụ lấy 1 ID High từ catalog để gợi ý.  
**Không** bảo user chỉ `/quality-qc-run` ngay sau import (sẽ skip / chưa có assert).  
`/quality-qc-codegen` là tuỳ chọn (khung backlog) — không phải bước “chạy xem đúng sai”.

## Notes

- Refuse to run inside Base `project-quality-kit` — work in the `<project>-quality` clone.
- See `docs/qc-excel-bridge.md`, `GETTING-STARTED.md` §4.
