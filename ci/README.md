# CI fragments — Project Quality Kit

Reusable job snippets for **clone** (`*-quality`) and **Base** (`project-quality-kit`).

| File | Use |
|------|-----|
| [`gitlab/e2e.gitlab-ci.yml`](./gitlab/e2e.gitlab-ci.yml) | GitLab: smoke e2e on clone |
| [`github/e2e.github-actions.yml`](./github/e2e.github-actions.yml) | GitHub Actions: smoke e2e on clone |
| [`github/verify-base.github-actions.yml`](./github/verify-base.github-actions.yml) | GitHub: `verify:base` on Base repo |

Copy or `include` from the workspace pipeline. Do **not** put secrets in these files.

### Clone (recommended)

```yaml
# .gitlab-ci.yml (workspace or quality repo)
include:
  - local: 'fti-agreement-management-quality/ci/gitlab/e2e.gitlab-ci.yml'
```

### Variables

| Variable | Meaning |
|----------|---------|
| `QUALITY_KIT_DIR` | Path to clone (default `.` when job runs inside quality repo) |
| `PW_SKIP_WEBSERVER` | `1` = do not start FE (use already-running URL or harness-only) |
| `E2E_REAL_TOKEN` | Only for real-mode jobs (not in smoke template) |
