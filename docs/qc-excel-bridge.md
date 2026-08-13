# QC Excel Bridge

> **VI:** Excel ISC → Pass/Fail hệ thống (implement-first).  
> **EN:** ISC Excel → system Pass/Fail (implement-first).

## Mental model

| Bước | Skill / lệnh | Kết quả |
|------|--------------|---------|
| 1. Import | `/quality-qc-import` | `qc/catalog.json` |
| 2. Implement | `/quality-qc-implement TC_*` hoặc `--sheet X --priority High` | Spec + assert + run |
| 3. Coverage | `/quality-qc-coverage` | `qc/coverage.html` + `qc/coverage.json` |
| 4. Re-run | `/quality-qc-run --id …` / `--sheet …` | `qc/results.json` |
| 5. Export | `npm run qc:export [--sheet Template]` | `qc/results.xlsx` (+ **QC Run Summary**) |

Codegen stub (`test.fixme`) chỉ là backlog tùy chọn.

## Batch implement

```text
/quality-qc-implement --sheet Template --priority High
```

Agent dùng `npm run qc:list -- --sheet Template --priority High --status stub --json` rồi làm tuần tự, báo bảng Pass/Fail/Skip.

## Pass / Fail / Skip / empty-pass

| Playwright | Ý nghĩa |
|------------|---------|
| passed + `expect` | Hệ thống khớp expected đã automate |
| failed | Lệch — xem `test-results/` (screenshot/video/trace) |
| skipped (`fixme`) | Chưa automate |
| implemented không `expect` | **Empty-pass** — `qc:run` WARN; `QC_STRICT_EMPTY=1` từ chối chạy |

## Reports & artifacts

| Path | Nội dung |
|------|----------|
| `qc/results.json` | Theo `qcId` (+ attachments khi fail). **Merge** theo `qcId` mỗi lần chạy (smoke/partial không xoá TC khác). `QC_RESULTS_REPLACE=1` = ghi đè toàn bộ. |
| `qc/results.xlsx` | Write-back KQ Script/Status + sheet **QC Run Summary** |
| `qc/coverage.html` | Dashboard catalog / stub / impl / last run |
| `playwright-report/` | HTML Playwright |
| `test-results/` | Screenshot / video / trace khi fail |

## Seed helpers

```ts
import { makeListItem, padCode } from "../factories/seed";
```

Dùng trong `e2e/fixtures/domains/*.ts` để seed list + `searchText` (Keyword contains).

## Shell cheat sheet

```bash
npm run qc:import:py
npm run qc:list -- --sheet Template --priority High --status stub
npm run qc:coverage -- --open
npm run qc:run -- --id TC_10.31
npm run qc:run -- --sheet Template --priority High
npm run qc:export -- --sheet Template
```

## Excel columns used

| Column | Role |
|--------|------|
| Testcase ID | ↔ `qcId` |
| Priority / Group / Sheet | Filter waves |
| Pre-condition / Steps / Expected | Implement source |
| Automated / Script / KQ Script / Status | Export write-back |
