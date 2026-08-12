# Auth real mode

> Chạy e2e chống **backend/FE thật** (không mock session). Mặc định kit dùng **cookie-fake + harness**.

## Khi nào dùng

| Mode | Lệnh | Auth |
|------|------|------|
| mock (mặc định) | `npm run test:e2e` / `test:e2e:smoke` | Cookie giả + route mock |
| real | `npm run test:e2e-real` | `authenticateReal` → `playwright/.auth/user.json` |

## Setup (1 lần / dự án)

1. Trong `_meta/project.yml`:

```yaml
auth:
  strategy: cookie-fake   # giữ fake cho mock; real dùng adapter
  cookie_name: access_token
  real:
    token_env: E2E_REAL_TOKEN
    login_url: "https://…/login"      # optional SSO/UI login
    token_endpoint: "https://…/oauth/token"  # optional API token
```

2. Implement `e2e/fixtures/adapters/auth.real.stub.ts` → `authenticateReal`:
   - Đọc `process.env[cfg.auth.real.token_env]` **hoặc** gọi `token_endpoint` **hoặc** UI `login_url`
   - Set cookie / localStorage theo app
   - Return token string

3. `e2e/specs/auth.setup.ts` đã gọi adapter và ghi `playwright/.auth/user.json`.

4. Chạy:

```bash
export E2E_REAL_TOKEN="…"   # nếu dùng token env
npm run test:e2e-real
# headed: npx playwright test --project=chromium --headed
```

## Playwright projects

| Project | Dùng khi |
|---------|----------|
| `mock` | Specs mặc định + harness |
| `chromium` | Real / storageState; bỏ qua `*.mock.spec.ts` và `harness-only` |

`playwright.config.ts` gắn `storageState` khi file `.auth/user.json` tồn tại. Setup project chạy trước khi cần (dependency):

```ts
// already wired when PLAYWRIGHT_MODE=real — see playwright.config.ts
```

## Bảo mật

- **Không** commit `playwright/.auth/`, token, `.env*`
- CI: inject `E2E_REAL_TOKEN` qua secret masked
- Prefer token env over hard-coded password in adapter

## Troubleshooting

| Lỗi | Cách xử lý |
|-----|------------|
| `Not implemented for this project yet` | Điền `authenticateReal` |
| `Set auth.real.token_endpoint or login_url` | Sửa `project.yml` |
| 401 trên API | Token hết hạn / cookie name sai |
| FE redirect login | storageState chưa có — chạy lại setup |
