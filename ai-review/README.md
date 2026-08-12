# AI Review (phase 2 scaffold)

> **VI:** Khung luật / prompt AI review gắn CI — **chưa bật pipeline**. Clone có thể thêm rule riêng trong `ai-review/project/` (không bị upgrade đè nếu giữ ngoài list refresh — hiện cả `ai-review/` bị refresh: để rule riêng trong `ai-review/project/` và bổ sung preserve sau).  
> **EN:** Scaffold for AI review rules/prompts in CI — **not wired yet**.

## Layout

```
ai-review/
  README.md                 ← file này
  rules/
    00-general.md           ← luật chung (diff review)
    10-playwright-qc.md     ← luật đặc thù QC / e2e
  prompts/
    review-system.md        ← system prompt gợi ý
  project/                  ← (tuỳ chọn) luật riêng dự án
    .gitkeep
  ci/
    github-actions.ai-review.yml.tpl
    gitlab-ci.ai-review.yml.tpl
```

## Cách dùng (tương lai)

1. Copy snippet CI từ `ci/*.tpl` vào pipeline dự án.  
2. Trỏ model/provider qua secret (`OPENAI_API_KEY` / internal gateway) — **không** commit key.  
3. Job đọc `rules/*.md` + diff PR → comment findings.  
4. Skill agent: `/quality-ai-review` (placeholder) khi bật phase 2.

## Hard rules (preview)

- Không approve secret / credential trong diff.  
- Spec QC phải có `expect` thật — cấm “pass giả”.  
- Đổi engine Base → nhắc cập nhật `CHANGELOG` + `engine-version`.
