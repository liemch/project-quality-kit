# QC Excel Bridge

> **VI:** Cách gắn Playwright với file testcase QC chuẩn ISC — từ Excel đến Pass/Fail hệ thống.  
> **EN:** How Playwright binds to ISC QC workbooks — from Excel to system Pass/Fail.

## Mental model (đọc trước)

Excel QC chỉ chứa **mô tả** (precondition / steps / expected bằng chữ).  
Import + codegen **không** tự biết hệ thống đúng hay sai.

| Bước | Skill | Kết quả |
|------|-------|---------|
| 1. Import | `/quality-qc-import` | `qc/catalog.json` — danh sách TC |
| 2. (Tuỳ chọn) Codegen | `/quality-qc-codegen` | khung `test.fixme` — backlog, **skip** khi chạy |
| 3. **Implement + chạy** | **`/quality-qc-implement TC_xx.y`** | Agent viết step/assert + chạy → **Pass/Fail hệ thống** |
| 4. Chạy lại | `/quality-qc-run --id TC_xx.y` | Re-run case đã implement |
| 5. Export | `npm run qc:export` | `qc/results.xlsx` (không đè file QC gốc) |

**Người mới chỉ cần nhớ:** import xong → `/quality-qc-implement TC_…` → đọc Pass/Fail.

## What the Excel already gives us

| Column | Role for automation |
|--------|---------------------|
| `Testcase ID` (e.g. `TC_03.1`) | Primary key ↔ Playwright annotation `qcId` |
| `Req ID` | Traceability to BA requirements |
| `Group` | Functional / UI / Integration / Database |
| `Priority` | High (P1) / Medium / Low — waves |
| `Test Title` / `Pre-condition` / `Test Steps` / `Expected Result` | Spec authoring source |
| `Automated` / `Script` / `KQ Script` / `Status` | Write-back targets after a run |

Meta sheets skipped on import: Cover, Guideline, Revision History, Summary, Dashboard, Report Test, Bug Data, RTM.

## Recommended workflow

```mermaid
flowchart LR
  QC[QC Excel] -->|qc:import| CAT[qc/catalog.json]
  CAT -->|qc-implement agent| SPEC[Playwright test + expect]
  SPEC -->|qc:run| PW[Playwright]
  PW -->|results| RES[Pass/Fail hệ thống]
  RES -->|qc:export| OUT[qc/results.xlsx]
```

### Agent path (khuyến nghị)

```text
/quality-qc-import
/quality-qc-implement TC_12.1
```

Agent có thể gọi codegen nội bộ khi cần stub; user **không** phải sửa `test.fixme` tay.

### Shell path (advanced)

```bash
npm run qc:import:py -- --file qc/input/ISC_*_TestCase.xlsx
npm run qc:codegen -- --id TC_12.1          # optional stub only
# … implement steps + expect in the spec …
npm run qc:run -- --id TC_12.1
npm run qc:export
```

## Pass / Fail / Skip nghĩa là gì

| Playwright | Ý nghĩa với hệ thống |
|------------|----------------------|
| **passed** + có `expect` thật | Hệ thống khớp expected đã automate |
| **failed** | Lệch expected / UI / giả định — cần xem lỗi |
| **skipped** (`test.fixme`) | Chưa automate — **không** kết luận đúng/sai |
| **passed** nhưng body trống (`void page`) | **Pass giả** — cấm; skill implement không được để vậy |

## Codegen (Level A) — chỉ là backlog

```bash
npm run qc:codegen -- --priority High
# --group Functional | --sheet "…" | --id TC_01.1 | --all | --dry-run
```

Writes `e2e/specs/qc/<sheet>.generated.spec.ts` (`test.fixme` + `qcId` + comments).  
Skips TC ids already implemented as real `test(...)`.

Không claim “đã automate” chỉ vì có stub.

## What to automate first

| Priority | Suggestion |
|----------|------------|
| P1 Functional | Happy paths + hard validations |
| P1 UI | Only if selector-stable (prefer role/label) |
| Integration / email / external | Cần data hoặc `*.real` — implement skill phải hỏi / skip nếu thiếu |
| Pure visual / copy | Keep manual in Excel |

## Coverage

```bash
cat qc/coverage.json
```

## Phase 2

- Map `Req ID` ↔ KB `09-requirements/REQ-*`
- Batch implement waves với report bảng Pass/Fail
