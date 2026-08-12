---
name: quality-qc-codegen
description: >
  Generate Playwright test.fixme stubs from QC catalog.json (optional backlog
  scaffolding). Use when the user says "/quality-qc-codegen", "/quality
  qc-codegen", "sinh stub từ Excel QC", "codegen testcase", "gen spec từ
  catalog", or "tạo test.fixme từ TC". Prefer /quality-qc-implement when the
  user wants to verify the system against a TC (Pass/Fail).
---

# /quality-qc-codegen — Excel catalog → stub specs (backlog only)

**Không** sinh automation kiểm tra hệ thống. Sinh `test.fixme` gắn `qcId` + comment Pre/Steps/Expected → Playwright **skip**.

Người muốn **Pass/Fail hệ thống** → chuyển **`/quality-qc-implement TC_*`** (skill đó có thể gọi codegen nội bộ).

## Prerequisites

1. Catalog exists: run `/quality-qc-import` first.
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
```

Output:

- `e2e/specs/qc/<sheet-slug>.generated.spec.ts`
- `qc/coverage.json`

Skip TC đã có `test(...)` thật (không phải `test.fixme`) dưới `e2e/`.

## After codegen

1. Báo: số stub / file / id đã implemented (bỏ qua).
2. Nói rõ: stub = **chưa** kiểm tra hệ thống; chạy `--id` lúc này → **skipped**.
3. Next: `/quality-qc-implement TC_xx.y` (không bảo “sửa tay fixme” là bước chính).

## Hard rules

- Không claim “đã automate” chỉ vì có stub.
- Không `--force` ghi đè implemented specs trừ khi user explicit.
