# QC Golden patterns

> **VI:** 3 test Pass mẫu — copy khi `/quality-qc-implement`.  
> **EN:** Three Pass examples — copy when implementing Excel TCs.

## Specs

| qcId | File | Pattern |
|------|------|---------|
| `TC_GOLDEN.1` | `e2e/specs/golden/qc-golden.spec.ts` | `makeListItem` / `seedMany` + crud list filter + `expect` |
| `TC_GOLDEN.2` | same | `antd.tableRows` + `expectMessageSuccess` (fixture DOM) |
| `TC_GOLDEN.3` | same | `antd.drawer` + `fillFormField` (fixture DOM) |

## Run (Base or clone)

```bash
npx playwright test e2e/specs/golden --project=mock
# or single:
npx playwright test e2e/specs/golden -g "TC_GOLDEN.1" --project=mock
```

## Hard rules (same as implement skill)

1. Annotation `qcId` + real steps.  
2. ≥1 meaningful `expect(...)` — never `expect(true)` / title-only.  
3. Prefer `antd.*` + `factories/seed` over raw CSS.  
4. Mock harness by default; real mode only when asked.

## After copy into a project sheet

1. Rename `TC_GOLDEN.*` → real Excel id (`TC_12.1`).  
2. Replace fixture `setContent` with `goto` + domain harness.  
3. `npm run qc:run -- --id TC_12.1`
