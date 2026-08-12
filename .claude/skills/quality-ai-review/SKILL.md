---
name: quality-ai-review
description: >
  AI-review CI scaffold inside Project Quality Kit (phase 2). Use when the user
  says "/quality-ai-review", "AI review pipeline", or asks to draft CI review
  rules for the quality sibling. Scaffold exists under ai-review/ — do not invent
  live credentials or claim the job is production-wired unless the user asks to
  enable it.
---

# /quality-ai-review — Phase 2 scaffold

## Current state

`ai-review/` có **rules + prompts + CI templates** — **chưa** gắn secret/model thật.

| Path | Role |
|------|------|
| `ai-review/rules/*.md` | Luật review (general + Playwright/QC) |
| `ai-review/prompts/review-system.md` | System prompt gợi ý |
| `ai-review/ci/*.tpl` | Snippet GitHub Actions / GitLab CI |
| `ai-review/project/` | Luật riêng clone (upgrade **không** đè) |

## When user explores

Chỉ rõ phase-2 + trỏ `ai-review/README.md`. Offer draft design / copy tpl — không ship CI unverified.

## When user asks to enable

1. Confirm provider + secret name.
2. Copy tpl vào pipeline workspace/clone.
3. Keep project overrides in `ai-review/project/`.
4. Remind: empty-pass + secrets là hard rules đã viết sẵn.
