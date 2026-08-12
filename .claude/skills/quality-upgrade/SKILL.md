---
name: quality-upgrade
description: >
  Upgrade Project Quality Kit engine from upstream while preserving project-owned
  domains, specs, QC input, and _meta/project.yml. Use when the user says
  "/quality-upgrade", "/quality upgrade", "nâng cấp quality kit", "upgrade e2e
  harness", or "kéo bản quality mới".
---

# /quality-upgrade — Upgrade engine

## Procedure

1. Resolve `KIT_ROOT`.
2. Ask for upstream source if missing:
   - local path to template `project-quality-kit`, or
   - git URL + `--ref` (default `main`)
3. Dry-run first when user is unsure:

```bash
cd "$KIT_ROOT"
./scripts/upgrade-quality.sh --from "$UPSTREAM" --dry-run
```

4. On approve, run without `--dry-run`.
5. Re-wire skills (engine skills may have changed):

```bash
./scripts/wire-quality-skills.sh
```

6. Offer `npm install` + `npm run test:e2e:smoke`.
7. Reply: what was refreshed vs preserved.

## Preserved vs refreshed

See `scripts/upgrade-quality.sh` header. Never overwrite `_meta/project.yml`, project domains/specs, or `qc/input/**`.
