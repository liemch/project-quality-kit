# AI Review (placeholder)

> **VI:** Module dành cho luật / prompt AI review gắn pipeline CI/CD (phase 2).  
> **EN:** Reserved for AI review rules/prompts wired into CI/CD (phase 2).

Suggested future layout:

```
ai-review/
  rules/           # markdown rules per path glob (like .gitlab/ai-review/)
  prompts/
  ci-job.yml.tpl   # include snippet for GitLab/GitHub
```

Do not put secrets here. Engine upgrades may refresh this folder — keep project-specific rules under `ai-review/project/` (to be introduced in phase 2).
