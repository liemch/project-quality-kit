# GitLab CI — AI review job template (phase 2, not active)
# Include from .gitlab-ci.yml and set CI variables for the model gateway.
ai-review:
  stage: test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  script:
    - echo "TODO: run AI review with ai-review/rules/*.md"
    - echo "See ai-review/README.md"
  allow_failure: true
