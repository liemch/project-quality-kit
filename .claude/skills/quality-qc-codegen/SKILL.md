---
name: quality-qc-codegen
description: >
  Generate Playwright test.fixme stubs from QC catalog.json (Excel → stubs →
  implement → run). Use when the user says "/quality-qc-codegen", "/quality
  qc-codegen", "sinh stub từ Excel QC", "codegen testcase", "gen spec từ
  catalog", or "tạo test.fixme từ TC".
---

# /quality-qc-codegen — Excel catalog → stub specs (Level A)

**Không** sinh spec runnable đầy đủ. Sinh `test.fixme` gắn `qcId` + comment Pre/Steps/Expected.

## Prerequisites

1. Catalog exists: run `/quality-qc-import` (or `npm run qc:import:py`) first.
2. Resolve `KIT_ROOT`.

## Default wave

Nếu user không nói filter → **`--priority High`** (P1).

| User muốn | Flags |
|-----------|--------|
| P1 (mặc định) | `--priority High` |
| P1 Functional only | `--priority High --group Functional` |
| 1 sheet | `--sheet "Create resource"` |
| 1 TC | `--id TC_01.1` |
| Toàn bộ catalog | `--all` |
| Xem trước | `--dry-run` |
| Ghi đè file stub | `--force` (vẫn skip TC đã `test(...)` thật) |

## Procedure

```bash
cd "$KIT_ROOT"
npm run qc:codegen -- --priority High
# or
npm run qc:codegen -- --priority High --group Functional
```

Output:

- `e2e/specs/qc/<sheet-slug>.generated.spec.ts`
- `qc/coverage.json` (số stub / implemented)

Skip TC đã có `test(...)` thật (không phải `test.fixme`) ở bất kỳ spec nào dưới `e2e/`.

## After codegen

1. Báo cáo: bao nhiêu stub, bao nhiêu file, bao nhiêu id đã implemented (bỏ qua).
2. Next steps cho user:
   - Implement: bỏ `test.fixme` → `test`, viết step
   - `/quality-qc-run --priority High` (hoặc `--headed`)
   - Wave tiếp theo (P2) khi P1 ổn

## Hard rules

- Không claim “đã automate” chỉ vì có stub.
- Không `--force` ghi đè implemented specs trừ khi user explicit (codegen luôn skip `test(...)` thật).
- Stub `test.fixme` = skipped trong Playwright — đúng ý backlog.
