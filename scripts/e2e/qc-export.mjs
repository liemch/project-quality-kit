#!/usr/bin/env node
/**
 * Merge qc/results.json (from qc-reporter) back into a copy of the QC Excel.
 * Writes: qc/results.xlsx (does NOT overwrite the QC source file).
 *
 * Mapping (ISC template columns — best effort by header name):
 *   Testcase ID → match
 *   KQ Script / Status (total) ← passed/failed
 *   Automated ← "Yes" when a script ran
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { assertNotBaseTemplate } from "../lib/refuse-base.mjs";
import { loadProjectCfg } from "../lib/load-project-cfg.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname, "../..");
assertNotBaseTemplate(KIT_ROOT, "qc:export");

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const SKIP_SHEETS = new Set([
  "Cover",
  "Guideline",
  "Revision History",
  "Summary",
  "Dashboard",
  "Report Test",
  "Bug Data",
  "RTM",
]);

function parseArgs(argv) {
  const out = { file: "", results: "" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file") out.file = argv[++i];
    else if (argv[i] === "--results") out.results = argv[++i];
  }
  return out;
}

function normHeader(cell) {
  return String(cell ?? "")
    .replace(/\n/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadProjectCfg(KIT_ROOT);
  const resultsPath = path.resolve(KIT_ROOT, args.results || cfg.qc?.results_out || "qc/results.json");
  if (!fs.existsSync(resultsPath)) {
    console.error("[qc:export] No results file. Run tests with qcId annotations first:", resultsPath);
    process.exit(1);
  }
  const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
  const byId = new Map((results.rows || []).map((r) => [r.qcId, r]));

  let file = args.file;
  if (!file) {
    const catalogPath = path.resolve(KIT_ROOT, cfg.qc?.catalog_out || "qc/catalog.json");
    if (fs.existsSync(catalogPath)) {
      file = JSON.parse(fs.readFileSync(catalogPath, "utf8")).source;
    }
  }
  if (!file || !fs.existsSync(file)) {
    console.error("[qc:export] Provide --file <source.xlsx> (or import catalog first)");
    process.exit(1);
  }

  const wb = XLSX.readFile(file, { cellDates: true });
  let updated = 0;

  for (const sheetName of wb.SheetNames) {
    if (SKIP_SHEETS.has(sheetName)) continue;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
    let headerIdx = -1;
    let idCol = -1;
    let autoCol = -1;
    let statusCol = -1;
    let kqCol = -1;

    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i] || [];
      row.forEach((cell, idx) => {
        const h = normHeader(cell);
        if (h === "testcase id") {
          headerIdx = i;
          idCol = idx;
        }
        if (h === "automated") autoCol = idx;
        if (h === "status") statusCol = idx;
        if (h === "kq script") kqCol = idx;
      });
      if (headerIdx >= 0) break;
    }
    if (headerIdx < 0 || idCol < 0) continue;

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const id = rows[r]?.[idCol];
      if (!id || !byId.has(String(id).trim())) continue;
      const res = byId.get(String(id).trim());
      const excelStatus = res.status === "passed" ? "Pass" : res.status === "skipped" ? "N/A" : "Fail";
      const addr = (c, row) => XLSX.utils.encode_cell({ c, r: row });
      if (autoCol >= 0) ws[addr(autoCol, r)] = { t: "s", v: "Yes" };
      if (kqCol >= 0) ws[addr(kqCol, r)] = { t: "s", v: excelStatus };
      if (statusCol >= 0) ws[addr(statusCol, r)] = { t: "s", v: excelStatus };
      updated++;
    }
  }

  const out = path.join(KIT_ROOT, "qc/results.xlsx");
  XLSX.writeFile(wb, out);
  console.log(`[qc:export] updated ${updated} cell-row(s) → ${out}`);
}

main();
