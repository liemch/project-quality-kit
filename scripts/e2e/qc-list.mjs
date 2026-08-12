#!/usr/bin/env node
/**
 * List QC cases from catalog with implement status (stub / implemented / missing).
 *
 * Usage:
 *   npm run qc:list -- --sheet Template --priority High
 *   npm run qc:list -- --status stub --json
 *   npm run qc:list -- --id TC_10.31
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectCfg } from "../lib/load-project-cfg.mjs";
import { scanQcSpecs } from "../lib/scan-qc-specs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname, "../..");

function parseArgs(argv) {
  const out = {
    sheet: "",
    priority: "",
    group: "",
    id: "",
    status: "", // stub | implemented | missing | all
    json: false,
    limit: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sheet") out.sheet = argv[++i] || "";
    else if (a === "--priority") out.priority = argv[++i] || "";
    else if (a === "--group") out.group = argv[++i] || "";
    else if (a === "--id") out.id = argv[++i] || "";
    else if (a === "--status") out.status = argv[++i] || "";
    else if (a === "--limit") out.limit = Number(argv[++i] || 0);
    else if (a === "--json") out.json = true;
    else if (a === "-h" || a === "--help") {
      console.log(`Usage: qc:list [--sheet NAME] [--priority High] [--group Functional] [--id TC_x.y]
                [--status stub|implemented|missing|all] [--limit N] [--json]`);
      process.exit(0);
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadProjectCfg(KIT_ROOT);
  const catalogPath = path.resolve(KIT_ROOT, cfg.qc?.catalog_out || "qc/catalog.json");
  if (!fs.existsSync(catalogPath)) {
    console.error("[qc:list] No catalog. Run /quality-qc-import first:", catalogPath);
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const scan = scanQcSpecs(KIT_ROOT);
  const resultsPath = path.resolve(KIT_ROOT, cfg.qc?.results_out || "qc/results.json");
  const lastById = new Map();
  if (fs.existsSync(resultsPath)) {
    const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
    for (const r of results.rows || []) lastById.set(r.qcId, r);
  }

  let rows = (catalog.cases || []).map((c) => {
    const impl = scan.byId.get(c.id);
    let status = "missing";
    if (impl?.kind === "implemented") status = "implemented";
    else if (impl?.kind === "stub") status = "stub";
    const last = lastById.get(c.id);
    return {
      id: c.id,
      title: c.title,
      sheet: c.sheet,
      priority: c.priority,
      group: c.group,
      status,
      file: impl?.file || "",
      line: impl?.line || 0,
      suspiciousEmpty: !!impl?.suspiciousEmpty,
      lastResult: last?.status || "",
    };
  });

  if (args.id) rows = rows.filter((r) => r.id === args.id);
  if (args.sheet) rows = rows.filter((r) => String(r.sheet).toLowerCase() === args.sheet.toLowerCase());
  if (args.priority) {
    rows = rows.filter((r) => String(r.priority).toLowerCase() === args.priority.toLowerCase());
  }
  if (args.group) rows = rows.filter((r) => String(r.group).toLowerCase() === args.group.toLowerCase());
  if (args.status && args.status !== "all") {
    rows = rows.filter((r) => r.status === args.status);
  }
  if (args.limit > 0) rows = rows.slice(0, args.limit);

  const summary = {
    total: rows.length,
    stub: rows.filter((r) => r.status === "stub").length,
    implemented: rows.filter((r) => r.status === "implemented").length,
    missing: rows.filter((r) => r.status === "missing").length,
    suspiciousEmpty: rows.filter((r) => r.suspiciousEmpty).length,
  };

  if (args.json) {
    console.log(JSON.stringify({ summary, cases: rows }, null, 2));
    return;
  }

  console.log(
    `[qc:list] ${summary.total} case(s) — implemented ${summary.implemented}, stub ${summary.stub}, missing ${summary.missing}` +
      (summary.suspiciousEmpty ? `, suspiciousEmpty ${summary.suspiciousEmpty}` : ""),
  );
  for (const r of rows) {
    const flag = r.suspiciousEmpty ? " ⚠ empty-pass?" : "";
    const last = r.lastResult ? ` last=${r.lastResult}` : "";
    console.log(`  ${r.id.padEnd(10)} ${r.status.padEnd(12)} ${r.priority || "-"} / ${r.sheet || "-"}${last}${flag}`);
    console.log(`             ${r.title}`);
  }
}

main();
