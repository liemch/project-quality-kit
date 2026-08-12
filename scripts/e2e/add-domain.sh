#!/usr/bin/env bash
# Scaffold a new domain harness config: e2e/fixtures/domains/<slug>.ts
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ "$(basename "$ROOT")" == "project-quality-kit" && "${QUALITY_ALLOW_BASE_INIT:-0}" != "1" ]]; then
  echo "[add-domain] Refusing to mutate Base template '$ROOT'. Clone to <project>-quality first." >&2
  exit 1
fi
SLUG="${1:-}"
[[ -n "$SLUG" ]] || { echo "Usage: $0 <domain-slug>"; exit 1; }
SLUG="$(printf '%s' "$SLUG" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-')"
SLUG="${SLUG#-}"
SLUG="${SLUG%-}"
OUT="$ROOT/e2e/fixtures/domains/${SLUG}.ts"
[[ ! -f "$OUT" ]] || { echo "Already exists: $OUT"; exit 1; }

export ADD_DOMAIN_SLUG="$SLUG"
export ADD_DOMAIN_OUT="$OUT"
python3 <<'PY'
import os
from pathlib import Path

slug = os.environ["ADD_DOMAIN_SLUG"]
out = Path(os.environ["ADD_DOMAIN_OUT"])
name = "".join(p.title() for p in slug.replace("_", "-").split("-"))
res_key = slug.replace("-", "")
code_suffix = slug.replace("-", "_").upper()

content = f"""import {{ defineDomainHarness }} from "../harness";
import {{ loadProjectConfig }} from "../load-config";

const cfg = loadProjectConfig();
const base = cfg.web.base_path.replace(/\\/$/, "") || "";

export type {name} = {{
  id: number;
  name: string;
  isActive: boolean;
}};

export const {{
  test,
  expect,
  makeRecords: make{name}s,
}} = defineDomainHarness({{
  url: `${{base}}/setting/{slug}`, // TODO: set real page URL
  ready: {{ columnheader: "Name" }}, // TODO: set real column header / ready fn
  functionCode: `${{cfg.project.code}}.SETTING.{code_suffix}`, // TODO: set real function code
  resources: {{
    {res_key}: {{
      path: "/{slug}s", // TODO: set real API path
      primary: true,
      seedCount: 12,
      seed: (i) => ({{
        id: i,
        name: `{name} ${{String(i).padStart(2, "0")}}`,
        isActive: i % 2 === 1,
      }}),
      writableFields: ["name", "isActive"],
    }},
  }},
}});
"""
out.write_text(content, encoding="utf-8")
print(f"[add-domain] Created {out}")
print(f"[add-domain] Next: write e2e/specs/{slug}-list.spec.ts importing from this domain")
PY
