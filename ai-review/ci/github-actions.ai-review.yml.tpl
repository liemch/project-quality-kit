# GitHub Actions — AI review job template (phase 2, not active)
#
# Copy into the clone or workspace workflow and fill secrets.
name: ai-review
on:
  pull_request:
    paths:
      - "e2e/**"
      - "qc/**"
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: "TODO: run AI review"
        run: |
          echo "Wire model provider + ai-review/rules/*.md here"
          echo "See ai-review/README.md"
