---
name: quality-ai-review
description: >
  Placeholder for AI-review CI rules inside Project Quality Kit (phase 2). Use
  when the user says "/quality-ai-review", "AI review pipeline", or asks to
  generate CI review rules for the quality sibling. Currently documents the
  planned layout only — do not invent production CI jobs yet.
---

# /quality-ai-review — Phase 2 placeholder

## Current state

`ai-review/` in the kit is a **placeholder**. Do not generate real CI credentials or claim jobs are wired.

## When asked to proceed (phase 2)

1. Confirm with user before writing CI job files.
2. Suggested layout (from `ai-review/README.md`):

```
ai-review/
  rules/
  prompts/
  project/          # project-owned (upgrade-safe)
  ci-job.yml.tpl
```

3. Prefer include-snippets under `ci/gitlab/` rather than editing app repos’ pipelines blindly.
4. After adding engine files, remind: `/quality-upgrade` consumers get them on next upgrade; project rules stay under `ai-review/project/`.

## Reply if user only explores

Explain phase-2 status + point to `ai-review/README.md` and `ci/gitlab/README.md`. Offer to draft a design, not ship unverified CI.
