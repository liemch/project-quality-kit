---
name: quality-qc-implement
description: >
  Primary newbie path: take one QC Testcase ID from catalog, write a real
  Playwright test (steps + assertions), then run it and report Pass/Fail for
  the system under test. Use when the user says "/quality-qc-implement",
  "/quality implement", "implement TC_12.1", "viết test cho TC", "chạy testcase
  Excel xem hệ thống đúng sai", "automate TC", "làm testcase này chạy được",
  or after import when they want to verify the app against a QC case — NOT when
  they only want stubs (/quality-qc-codegen) or re-run an already-implemented
  case (/quality-qc-run).
---

# /quality-qc-implement — Excel TC → test thật → Pass/Fail hệ thống

Đây là **luồng chính cho người mới**:

```text
Import Excel xong → /quality-qc-implement TC_xx.y → agent viết + chạy → Pass/Fail
```

Người dùng **không** cần tự mở file đổi `test.fixme` → `test`. Agent làm giúp.

Agent **phải tự implement + chạy** — không chỉ bảo user sửa tay / gõ `npm run …`.

## Mental model (nói rõ với user nếu họ hỏi)

| Bước | Ai làm | Ý nghĩa |
|------|--------|---------|
| `/quality-qc-import` | script | Đưa Excel → `catalog.json` (mô tả TC) |
| `/quality-qc-codegen` | script | (Tuỳ chọn) khung `test.fixme` — **chưa kiểm tra hệ thống** |
| **`/quality-qc-implement TC_*`** | **agent** | Viết step + assert + chạy → **Pass/Fail hệ thống** |
| `/quality-qc-run TC_*` | script | Chỉ chạy lại case **đã** implement |

Import/codegen **không** trả lời “hệ thống đúng hay sai”. Chỉ implement + assert mới trả lời được.

## Prerequisites

1. Resolve `KIT_ROOT` (`*-quality` clone — không chạy trên Base `project-quality-kit`).
2. `qc/catalog.json` tồn tại — else chạy `/quality-qc-import` trước.
3. User cung cấp **một** `TC_*` (vd `TC_12.1`). Nếu thiếu → hỏi ID (có thể gợi ý vài High từ catalog).
4. Web sibling / mock harness sẵn theo `_meta/project.yml` (smoke đã xanh thì ổn).

## Procedure (bắt buộc theo thứ tự)

### 1. Load testcase từ catalog

```bash
cd "$KIT_ROOT"
node -e "
const c=require('./qc/catalog.json');
const id=process.argv[1];
const x=c.cases.find(t=>t.id===id);
if(!x){console.error('NOT_FOUND',id); process.exit(1)}
console.log(JSON.stringify(x,null,2));
" TC_12.1
```

Ghi nhận: `title`, `sheet`, `priority`, `group`, `precondition`, `steps`, `expected`.

### 2. Đảm bảo có stub file (nếu chưa)

```bash
npm run qc:codegen -- --id TC_12.1
```

Hoặc tạo/sửa tay trong `e2e/specs/qc/<sheet-slug>.generated.spec.ts` (hoặc spec dedicated nếu ổn hơn).

Tìm spec hiện có:

```bash
rg -n 'description: "TC_12.1"|TC_12\.1' e2e/specs
```

### 3. Implement thật (Level B) — Hard rules

1. Đổi `test.fixme(...)` → `test(...)` **chỉ khi** đã viết step.
2. **Bắt buộc** có ít nhất một `expect(...)` meaningful (UI/API/state).  
   **Cấm** “pass giả”:
   - `void page;`
   - `expect(true).toBeTruthy()`
   - chỉ `expect("TC_…").toMatch(...)` (trừ smoke binding demo)
3. Map Pre-condition / Steps / Expected từ Excel → thao tác Playwright.
4. Dùng harness/domain nếu có (`e2e/fixtures/domains/`, COOKBOOK AntD selectors).
5. Đọc KB / web routes khi cần URL, quyền, label thật (`knowledge-base` + `am-web` nếu FTIAM).
6. Mock mode mặc định; `real` chỉ khi user xin + auth.real sẵn.
7. Nếu **không đủ thông tin** để assert an toàn (thiếu data, phụ thuộc email/SMS bên ngoài, v.v.):
   - giữ `test.fixme`
   - **không** chạy như Pass
   - báo rõ blocker + hỏi user (test data / headed / real mode)

### 4. Chạy đúng 1 TC

```bash
cd "$KIT_ROOT"
npm run qc:run -- --id TC_12.1
# headed nếu user muốn xem: --headed
```

### 5. Báo cáo cho user (bắt buộc)

Trả lời ngắn, rõ:

| Kết quả Playwright | Nói với user |
|--------------------|--------------|
| **passed** + có assert thật | **Pass** — hệ thống khớp expected đã automate cho `TC_*` |
| **failed** | **Fail** — hệ thống / selector / giả định lệch; trích lỗi + file:line |
| **skipped** (`fixme`) | Chưa kiểm tra được — còn blocker (nêu lý do) |

Kèm: path spec đã sửa, tóm tắt step đã viết, gợi ý `--headed` nếu fail khó đọc.

**Không** nói “testcase Pass” nếu body gần như trống.

## Batch (nhiều TC)

- Mặc định **1 TC / lần** (an toàn, dễ review).
- User xin wave (vd “implement 5 P1 Functional sheet Template”) → làm tuần tự, báo bảng Pass/Fail/Skip từng ID; dừng sớm nếu infra gãy (webServer chết).

## See also

- Chỉ import: `/quality-qc-import`
- Chỉ sinh khung: `/quality-qc-codegen`
- Chỉ chạy lại: `/quality-qc-run`
- Docs: `docs/qc-excel-bridge.md`, `GETTING-STARTED.md`
