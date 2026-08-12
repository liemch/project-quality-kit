# Playwright / QC review rules (preview)

- `test.fixme` = backlog only; do not treat skipped stubs as system Pass.
- Implemented `test(...)` for a `TC_*` **must** include at least one meaningful `expect(...)`.
- Prefer role/label selectors (Ant Design: `getByRole`) over brittle CSS chains.
- Mock domain harnesses that mirror API filter semantics should cite the handler/source in a short comment.
- After a wave: update/export `qc/results.xlsx` and refresh `npm run qc:coverage`.
- Fail artifacts live under `test-results/` (screenshot/video/trace) — link them in PR notes when red.
