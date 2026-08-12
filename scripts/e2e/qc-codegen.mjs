#!/usr/bin/env node
/**
 * Generate Playwright test.fixme stubs from qc/catalog.json (Level A).
 *
 * Usage:
 *   npm run qc:codegen -- --priority High
 *   npm run qc:codegen -- --priority High --group Functional
 *   npm run qc:codegen -- --sheet "Create resource"
 *   npm run qc:codegen -- --id TC_01.1
 *   npm run qc:codegen -- --all
 *   npm run qc:codegen -- --priority High --dry-run
 *
 * Output: e2e/specs/qc/<sheet-slug>.generated.spec.ts
 * Skips TC ids already implemented (test(…) not test.fixme) anywhere under e2e/.
 * --force: rewrite generated files (still skips real implementations).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNotBaseTemplate } from "../lib/refuse-base.mjs";
import { loadProjectCfg } from "../lib/load-project-cfg.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname, "../..");
assertNotBaseTemplate(KIT_ROOT, "qc:codegen");
const OUT_DIR = path.join(KIT_ROOT, "e2e/specs/qc");
const TC_RE = /TC_\d+\.\d+/g;

function loadProjectCfgLocal() {
  return loadProjectCfg(KIT_ROOT);
}

function parseArgs(argv) {
  const out = {
    priority: "",
    group: "",
    sheet: "",
    id: "",
    all: false,
    dryRun: false,
    force: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--priority") out.priority = argv[++i] || "";
    else if (a === "--group") out.group = argv[++i] || "";
    else if (a === "--sheet") out.sheet = argv[++i] || "";
    else if (a === "--id") out.id = argv[++i] || "";
    else if (a === "--all") out.all = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--force") out.force = true;
    else if (a === "-h" || a === "--help") {
      console.log(`Usage: qc-codegen [--priority High] [--group Functional] [--sheet NAME] [--id TC_x.y] [--all] [--dry-run] [--force]
Default (no filters): --priority High
`);
      process.exit(0);
    }
  }
  return out;
}

function slugify(input) {
  const map = {
    à: "a",
    á: "a",
    ạ: "a",
    ả: "a",
    ã: "a",
    â: "a",
    ầ: "a",
    ấ: "a",
    ậ: "a",
    ẩ: "a",
    ẫ: "a",
    ă: "a",
    ằ: "a",
    ắ: "a",
    ặ: "a",
    ẳ: "a",
    ẵ: "a",
    è: "e",
    é: "e",
    ẹ: "e",
    ẻ: "e",
    ẽ: "e",
    ê: "e",
    ề: "e",
    ế: "e",
    ệ: "e",
    ể: "e",
    ễ: "e",
    ì: "i",
    í: "i",
    ị: "i",
    ỉ: "i",
    ĩ: "i",
    ò: "o",
    ó: "o",
    ọ: "o",
    ỏ: "o",
    õ: "o",
    ô: "o",
    ồ: "o",
    ố: "o",
    ộ: "o",
    ổ: "o",
    ỗ: "o",
    ơ: "o",
    ờ: "o",
    ớ: "o",
    ợ: "o",
    ở: "o",
    ỡ: "o",
    ù: "u",
    ú: "u",
    ụ: "u",
    ủ: "u",
    ũ: "u",
    ư: "u",
    ừ: "u",
    ứ: "u",
    ự: "u",
    ử: "u",
    ữ: "u",
    ỳ: "y",
    ý: "y",
    ỵ: "y",
    ỷ: "y",
    ỹ: "y",
    đ: "d",
  };
  let s = String(input || "sheet").toLowerCase();
  s = s.replace(/[^\u0000-\u007f]/g, (ch) => map[ch] || map[ch.normalize?.("NFC")] || "");
  s = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "sheet";
}

function walkSpecs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkSpecs(p, acc);
    else if (ent.isFile() && ent.name.endsWith(".spec.ts")) acc.push(p);
  }
  return acc;
}

/** IDs that already have a real test(...) implementation (not only test.fixme). */
function findImplementedIds() {
  const implemented = new Set();
  const stubbed = new Set();
  for (const file of walkSpecs(path.join(KIT_ROOT, "e2e"))) {
    const text = fs.readFileSync(file, "utf8");
    const isGenerated = file.includes(`${path.sep}qc${path.sep}`) && file.endsWith(".generated.spec.ts");

    // Annotations: { type: "qcId", description: "TC_03.1" }
    for (const m of text.matchAll(/description:\s*["'](TC_\d+\.\d+)["']/g)) {
      const id = m[1];
      const idx = m.index ?? 0;
      const window = text.slice(Math.max(0, idx - 250), idx + 80);
      if (/test\.fixme\s*\(/.test(window) || /test\.fix\s*\(/.test(window)) stubbed.add(id);
      else if (/test\s*\(/.test(window)) implemented.add(id);
      else if (isGenerated) stubbed.add(id);
      else implemented.add(id);
    }

    // Title containing TC id (JSON.stringify titles use ")
    for (const m of text.matchAll(/test(?:\.fixme|\.fix)?\s*\(\s*(["'`])((?:\\.|(?!\1).)*TC_\d+\.\d+(?:\\.|(?!\1).)*)\1/g)) {
      const full = m[0];
      const ids = full.match(TC_RE) || [];
      const isFixme = /^test\.fixme\b/.test(full) || /^test\.fix\b/.test(full);
      for (const id of ids) {
        if (isFixme) stubbed.add(id);
        else implemented.add(id);
      }
    }
  }
  for (const id of implemented) stubbed.delete(id);
  return { implemented, stubbed };
}

function commentBlock(label, value) {
  const lines = String(value || "(empty)")
    .replace(/\r\n/g, "\n")
    .split("\n");
  return [`   * ${label}:`, ...lines.map((l) => `   *   ${l}`)].join("\n");
}

function renderStub(c) {
  const title = (c.title || "").trim() || c.id;
  const testName = `${c.id} ${title}`.slice(0, 180);
  return `
  /**
${commentBlock("Req", c.reqId)}
${commentBlock("Sheet", c.sheet)}
${commentBlock("Priority / Group", `${c.priority} / ${c.group}`)}
${commentBlock("Pre-condition", c.precondition)}
${commentBlock("Steps", c.steps)}
${commentBlock("Expected", c.expected)}
   */
  test.fixme(${JSON.stringify(testName)}, async ({ page }) => {
    test.info().annotations.push({ type: "qcId", description: ${JSON.stringify(c.id)} });
    // TODO: implement steps from Excel, then remove test.fixme → test
    void page;
  });
`;
}

function renderFile(sheet, cases) {
  const slug = slugify(sheet);
  return `/**
 * AUTO-GENERATED by \`npm run qc:codegen\` — Level A stubs (test.fixme).
 * Sheet: ${sheet}
 * Do not hand-edit stub bodies here long-term: implement by removing \`.fixme\`
 * or move the case to a dedicated hand-written spec (codegen will skip implemented ids).
 *
 * Regenerate: npm run qc:codegen -- --sheet "${sheet.replace(/"/g, '\\"')}"
 */
import { test, expect } from "@playwright/test";

test.describe(${JSON.stringify(`QC / ${sheet}`)}, () => {
  test.beforeEach(() => {
    // Stubs only — no shared navigation yet.
    void expect;
  });
${cases.map(renderStub).join("")}
});
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadProjectCfgLocal();
  const catalogPath = path.resolve(KIT_ROOT, cfg.qc?.catalog_out || "qc/catalog.json");
  if (!fs.existsSync(catalogPath)) {
    console.error("[qc:codegen] Missing catalog. Run qc:import / qc:import:py first:", catalogPath);
    process.exit(1);
  }

  // Default filter: High priority (recommended wave)
  if (!args.all && !args.priority && !args.group && !args.sheet && !args.id) {
    args.priority = "High";
    console.log("[qc:codegen] default filter: --priority High (pass --all to generate everything)");
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  let cases = catalog.cases || [];
  if (args.id) cases = cases.filter((c) => c.id === args.id);
  if (args.sheet) cases = cases.filter((c) => c.sheet === args.sheet);
  if (args.priority) {
    cases = cases.filter((c) => String(c.priority).toLowerCase().includes(args.priority.toLowerCase()));
  }
  if (args.group) {
    cases = cases.filter((c) => String(c.group).toLowerCase() === args.group.toLowerCase());
  }

  const { implemented, stubbed } = findImplementedIds();
  // Always skip real implementations; --force only means rewrite already-stubbed files.
  const pending = cases.filter((c) => !implemented.has(c.id));

  console.log(
    `[qc:codegen] catalog=${catalog.count} filtered=${cases.length} implemented=${[...implemented].filter((id) => cases.some((c) => c.id === id)).length} pending=${pending.length} already-stubbed=${[...stubbed].filter((id) => cases.some((c) => c.id === id)).length}${args.force ? " (force rewrite)" : ""}`,
  );

  const bySheet = new Map();
  for (const c of pending) {
    const key = c.sheet || "unknown";
    if (!bySheet.has(key)) bySheet.set(key, []);
    bySheet.get(key).push(c);
  }

  if (!args.dryRun) fs.mkdirSync(OUT_DIR, { recursive: true });

  let files = 0;
  let stubs = 0;
  for (const [sheet, list] of bySheet) {
    list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    const slug = slugify(sheet);
    const outPath = path.join(OUT_DIR, `${slug}.generated.spec.ts`);
    const body = renderFile(sheet, list);
    files++;
    stubs += list.length;
    if (args.dryRun) {
      console.log(`[qc:codegen] DRY ${list.length} stub(s) → ${path.relative(KIT_ROOT, outPath)}`);
    } else {
      fs.writeFileSync(outPath, body, "utf8");
      console.log(`[qc:codegen] wrote ${list.length} stub(s) → ${path.relative(KIT_ROOT, outPath)}`);
    }
  }

  // Coverage snapshot — rescan after write so stubbedCount is not inflated on re-run.
  const after = args.dryRun ? { implemented, stubbed } : findImplementedIds();
  const covPath = path.join(KIT_ROOT, "qc/coverage.json");
  const cov = {
    generatedAt: new Date().toISOString(),
    catalogCount: catalog.count,
    filter: { priority: args.priority, group: args.group, sheet: args.sheet, id: args.id, all: args.all },
    implementedCount: after.implemented.size,
    stubbedCount: after.stubbed.size,
    pendingGenerated: stubs,
    files,
  };
  if (!args.dryRun) {
    fs.writeFileSync(covPath, JSON.stringify(cov, null, 2));
    console.log(`[qc:codegen] coverage → ${path.relative(KIT_ROOT, covPath)}`);
  }

  console.log(`[qc:codegen] done: ${stubs} stubs in ${files} file(s)${args.dryRun ? " (dry-run)" : ""}`);
  console.log("[qc:codegen] next: implement stubs (remove test.fixme) then npm run qc:run -- --priority High");
}

main();
