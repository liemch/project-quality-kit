# General AI review rules (preview)

- Reject commits that add secrets (`.env`, tokens, private keys, production connection strings).
- Prefer small, reviewable diffs; flag drive-by refactors unrelated to the PR title.
- Require tests or QC bindings (`qcId`) when changing user-facing behavior covered by Excel TCs.
- Do not invent product requirements — cite KB or ticket IDs when asserting behavior.
