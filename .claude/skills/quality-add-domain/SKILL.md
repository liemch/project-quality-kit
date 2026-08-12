---
name: quality-add-domain
description: >
  Scaffold a new Playwright domain harness config under e2e/fixtures/domains/
  for the Project Quality Kit. Use when the user says "/quality-add-domain",
  "/quality add-domain", "thêm domain e2e", "scaffold domain harness", or
  "add e2e for special-term / forms / …".
---

# /quality-add-domain — Scaffold domain

## Procedure

1. Resolve `KIT_ROOT`.
2. Ask for `slug` if missing (kebab-case, e.g. `special-term`).
3. Run:

```bash
cd "$KIT_ROOT"
./scripts/e2e/add-domain.sh "$SLUG"
```

4. Open `e2e/fixtures/domains/<slug>.ts` and fill TODOs:
   - page `url` (under `base_path`)
   - `ready` (columnheader or custom)
   - `functionCode`
   - API `path` + seed/writableFields
5. Offer to create a starter spec `e2e/specs/<slug>-list.spec.ts` importing from the domain (ask before writing).
6. Suggest `/quality-test` to run the new file.

## Notes

- Domain files are **project-owned** — upgrade does not overwrite them.
- Escape hatch for non-CRUD: `extraRoutes` on `defineDomainHarness`.
