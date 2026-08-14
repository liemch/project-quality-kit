# QC implement wave — report template

> Dùng sau `/quality-qc-implement` (1 TC hoặc batch).  
> Hoặc generate: `npm run qc:wave-report -- --sheet Template --priority High`

```markdown
# QC Wave Report

- Sheet: {{sheet}}
- Priority: {{priority}}
- When: {{iso-date}}

| TC | Result | Note |
|----|--------|------|
| TC_xx.y | **Pass** | … |
| TC_xx.z | **Fail** | error summary → test-results/latest |
| TC_aa.b | **Skip** | stub / blocker (missing data) |

## Summary
- Pass: N
- Fail: N
- Skip: N
- Empty-pass: N (must fix — not system Pass)

## Blockers
- …

## Next
- Fail → fix app or assert; re-run `npm run qc:run -- --status failed`
- Skip stub → continue `/quality-qc-implement`
- `npm run qc:coverage -- --open`
- `npm run qc:export -- --sheet {{sheet}}`
```

**Hard rules:** Pass chỉ khi có `expect` thật. Empty-pass ≠ nghiệm thu hệ thống.
