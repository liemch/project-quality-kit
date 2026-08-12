---
name: quality-test
description: >
  Run Playwright e2e from the Project Quality Kit in any display mode: headless,
  headed (visible browser), observe (slow full-screen), or UI Mode (time-travel).
  Use when the user says "/quality-test", "/quality test", "/quality smoke",
  "/quality headed", "/quality observe", "/quality ui", "chạy e2e", "mở trình
  duyệt chạy test", "chạy headed", "chạy observe", "PW_OBSERVE", "playwright ui",
  "test e2e quality kit", or "xem test chạy trên browser".
---

# /quality-test — Run e2e (kèm chế độ hiển thị browser)

Agent **phải tự chạy** lệnh phù hợp — không chỉ bảo user gõ `npm run …`.

## Resolve kit + deps

1. `KIT_ROOT` via `_meta/project.yml` or sibling `*-quality`.
2. If no `node_modules` → offer `npm install && npx playwright install chromium`.
3. Always `cd "$KIT_ROOT"` before run.

## Subcommands / chế độ hiển thị

Khi user không nói rõ mode → **hỏi** (headless / headed / observe / ui), mặc định gợi ý **smoke headless** nếu họ chỉ muốn “chạy thử”.

| User nói | Subcommand | Browser hiện? | Command agent chạy |
|----------|------------|---------------|-------------------|
| smoke / chạy thử (mặc định) | `smoke` | Không | `npm run test:e2e:smoke` |
| all / full mock | `all` | Không | `npm run test:e2e` |
| headed / mở trình duyệt / có cửa sổ | `headed` | **Có** | `npm run test:e2e:headed` |
| observe / chậm / full-screen / xem từng bước | `observe` | **Có** (maximized + slowMo) | `PW_OBSERVE=1 PW_SLOWMO=400 npm run test:e2e:headed` |
| ui / debug / time-travel | `ui` | **Có** (Playwright UI) | `npm run test:e2e:ui` |
| report | `report` | — | `npm run test:e2e:report` |
| real / backend thật | `real` | Theo headed nếu user xin | `npm run test:e2e-real` (+ `--headed` nếu cần) |
| one file | `file <path>` | theo mode | `npx playwright test <path> --project=mock` [+ `--headed`] |
| grep | `grep <pat>` | theo mode | `npx playwright test -g "<pat>" --project=mock` [+ `--headed`] |

### Cách gắn mode vào file/grep

- Headed: thêm `--headed` vào lệnh `npx playwright test …`
- Observe: `PW_OBSERVE=1 PW_SLOWMO=400 npx playwright test … --headed`
- UI: `npx playwright test … --ui`

Ví dụ user: “chạy smoke có cửa sổ” → `npm run test:e2e:smoke -- --headed`  
(hoặc `npx playwright test e2e/specs/smoke --project=mock --headed`)

Ví dụ: “observe file X” →  
`PW_OBSERVE=1 PW_SLOWMO=400 npx playwright test e2e/specs/X --project=mock --headed`

## Procedure

1. Parse intent → chọn hàng trong bảng trên (hỏi nếu mơ hồ).
2. Chạy command (block đến khi xong; UI mode có thể chạy lâu — nói rõ cho user).
3. Tóm tắt pass/fail; fail → trỏ `test-results/` / `playwright-report/` + lỗi đầu tiên.
4. Không tự “fix” bug app trừ khi user yêu cầu.

## See also

- Theo QC Testcase ID → `/quality-qc-run` (cũng hỗ trợ headed/observe/ui)
- Config → `/quality-status`
