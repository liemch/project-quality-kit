# Quality Kit Cookbook (VI / EN)

## 1. Install / Cài đặt

**Khuyến nghị (agent):** `/quality-init` — hỏi input, chạy init, **wire skills** vào workspace.

**Shell:**

```bash
./scripts/init-quality.sh --name "…" --code … --wire-web-scripts
# skills wire + npm install + chromium ON by default
# (--no-wire-skills / --no-npm-install để tắt)
npm run test:e2e:smoke
```

KB sibling (nếu có) được đọc để lấy `web.repo`, `http_port`, `route_prefix`.  
Catalog skill: `.claude/skills/README.md` (`/quality-test`, `/quality-qc-import`, …).  
Lịch sử engine: [CHANGELOG.md](./CHANGELOG.md).

## 2. Architecture / Kiến trúc e2e (3 layers)

```
e2e/fixtures/core.ts           ← auth cookie + session mock + CORS + fallback
e2e/fixtures/crud-resource.ts  ← stateful list/CRUD mock
e2e/fixtures/harness.ts        ← defineDomainHarness({ url, ready, resources })
e2e/fixtures/domains/<x>.ts    ← ~20 lines project config per domain
e2e/specs/**/*.spec.ts         ← tests
```

## 3. Add a domain / Thêm domain (~5 phút)

```bash
./scripts/e2e/add-domain.sh special-term
# edit e2e/fixtures/domains/special-term.ts
# write e2e/specs/special-term-list.spec.ts
```

## 4. Modes / Chế độ chạy

| Mode | How | Notes |
|------|-----|-------|
| mock (default) | `npm run test:e2e` | In-memory API via harness |
| real | `PLAYWRIGHT_MODE=real npm run test:e2e-real` | Implement `e2e/fixtures/adapters/auth.real.stub.ts` first |
| observe | `PW_OBSERVE=1 PW_SLOWMO=400 npm run test:e2e:headed` | Full screen debug |

## 5. QC Excel

See [docs/qc-excel-bridge.md](./docs/qc-excel-bridge.md).

**Người mới:**

```text
/quality-qc-import
/quality-qc-implement TC_12.1
```

Shell:

```bash
cp ~/Downloads/ISC_*_TestCase.xlsx qc/input/
npm run qc:import:py
# then implement via /quality-qc-implement (or hand-write + expect)
npm run qc:run -- --id TC_12.1
npm run qc:export
```

## 6. Ant Design selector cheatsheet

- Rows: `.ant-table-tbody tr.ant-table-row`
- Pagination: `.ant-pagination-item-N`, `.ant-pagination-item-active`
- Confirm OK: `.ant-modal-confirm-btns .ant-btn-primary`
- Prefer: `getByRole("columnheader"|"dialog"|"button", { name })`

## 7. Upgrade

```bash
./scripts/upgrade-quality.sh --from /path/to/project-quality-kit
```

## 8. Wire web scripts

`init --wire-web-scripts` adds to the FE `package.json`:

- `test:e2e` → `npm --prefix ../<project>-quality run test:e2e`
- `test:e2e:smoke`, `qc:import`, `qc:run`

Default remains: run everything from the quality sibling (no coupling required).
