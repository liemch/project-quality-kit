# CI fragments (placeholder)

Future: reusable GitLab CI jobs for:

- `quality:e2e:smoke`
- `quality:qc:p1`
- `quality:ai-review` (phase 2)

Projects include snippets via:

```yaml
include:
  - local: '../<project>-quality/ci/gitlab/e2e.gitlab-ci.yml'
```
