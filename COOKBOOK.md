# Quality Kit Cookbook (VI / EN)

## 1. Install / Cài đặt

```bash
./scripts/init-quality.sh --name "…" --code … --wire-web-scripts \
  --git-remote git@github.com:org/my-project-quality.git
# skills + npm + chromium ON; optional team git remote
npm run test:e2e:smoke
```

Agent: `/quality-init`. Docs: [GETTING-STARTED.md](./GETTING-STARTED.md) · [CHANGELOG.md](./CHANGELOG.md).

## 2. Architecture

```
e2e/fixtures/core.ts              ← cookie + session mock + CORS
e2e/fixtures/crud-resource.ts     ← stateful list/CRUD mock
e2e/fixtures/harness.ts           ← defineDomainHarness
e2e/fixtures/factories/seed.ts    ← makeListItem, padCode
e2e/fixtures/ui/antd.ts           ← Ant Design helpers
e2e/fixtures/domains/<x>.ts       ← project domain (~20 lines)
e2e/specs/**/*.spec.ts
```

## 3. Add a domain

```bash
./scripts/e2e/add-domain.sh special-term
# edit domains/special-term.ts → write specs
```

## 4. Modes

| Mode | How | Notes |
|------|-----|-------|
| mock | `npm run test:e2e` | Harness + cookie-fake |
| real | `PLAYWRIGHT_MODE=real npm run test:e2e-real` | [docs/auth-real.md](./docs/auth-real.md) · `E2E_REAL_TOKEN` |
| observe | `PW_OBSERVE=1 PW_SLOWMO=400 npm run test:e2e:headed` | Full screen |
| skip FE server | `PW_SKIP_WEBSERVER=1` | CI / harness-only / FE already up |
| verbose Vite | `PW_WEBSERVER_LOG=1` | Debug webServer start |

## 5. QC Excel

See [docs/qc-excel-bridge.md](./docs/qc-excel-bridge.md).

```text
/quality-qc-import
/quality-qc-implement --sheet Template --priority High
/quality-qc-coverage
```

## 6. Ant Design helpers

```ts
import { antd } from "../fixtures/ui/antd";

await antd.searchDebounced(page, "00280129", { placeholder: "Mã, tên template" });
await expect(antd.tableRows(page)).toHaveCount(1);
await antd.modalOk(page).click();
await antd.confirmOk(page).click();
```

Cheatsheet (raw CSS if needed):

- Rows: `.ant-table-tbody tr.ant-table-row`
- Pagination: `.ant-pagination-item-N`
- Prefer `getByRole` over deep CSS

## 7. Seed factories

```ts
import { makeListItem, padCode } from "../factories/seed";
```

## 8. CI smoke

See [ci/README.md](./ci/README.md) — GitLab `quality:e2e:smoke`, GitHub `quality-e2e-smoke`, Base `verify:base`.

## 9. Upgrade

```bash
./scripts/upgrade-quality.sh --from https://github.com/liemch/project-quality-kit.git --ref main
```

## 10. Wire web scripts

`init --wire-web-scripts` adds `test:e2e*` / `qc:*` into the FE `package.json` (prefix into quality sibling).
