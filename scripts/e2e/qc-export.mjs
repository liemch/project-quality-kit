#!/usr/bin/env node
/**
 * Merge qc/results.json (from qc-reporter) back into a copy of the QC Excel,
 * plus a rich "QC Run Summary" sheet (by sheet / Pass Fail Skip).
 *
 * Writes: qc/results.xlsx (does NOT overwrite the QC source file).
 *
 * Usage:
 *   npm run qc:export
 *   npm run qc:export -- --sheet Template
 *   npm run qc:export -- --file qc/input/ISC_….xlsx --results qc/results.json
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { assertNotBaseTemplate } from "../lib/refuse-base.mjs";
import { loadProjectCfg } from "../lib/load-project-cfg.mjs";
import { scanQcSpecs } from "../lib/scan-qc-specs.mjs";

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
  "QC Run Summary",
]);

function parseArgs(argv) {
  const out = { file: "", results: "", sheet: "" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file") out.file = argv[++i];
    else if (argv[i] === "--results") out.results = argv[++i];
    else if (argv[i] === "--sheet") out.sheet = argv[++i];
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

function excelStatus(status) {
  if (status === "passed") return "Pass";
  if (status === "skipped") return "N/A";
  if (status === "failed" || status === "timedOut" || status === "interrupted") return "Fail";
  return status || "";
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
  let rows = results.rows || [];
  const catalogPath = path.resolve(KIT_ROOT, cfg.qc?.catalog_out || "qc/catalog.json");
  const catalog = fs.existsSync(catalogPath)
    ? JSON.parse(fs.readFileSync(catalogPath, "utf8"))
    : { cases: [] };
  const catalogById = new Map((catalog.cases || []).map((c) => [c.id, c]));
  const scan = scanQcSpecs(KIT_ROOT);

  if (args.sheet) {
    rows = rows.filter((r) => {
      const meta = catalogById.get(r.qcId);
      return meta && String(meta.sheet).toLowerCase() === args.sheet.toLowerCase();
    });
  }

  const byId = new Map(rows.map((r) => [r.qcId, r]));

  let file = args.file;
  if (!file && catalog.source) file = catalog.source;
  if (file && !path.isAbsolute(file)) file = path.resolve(KIT_ROOT, file);

  let wb;
  if (file && fs.existsSync(file)) {
    wb = XLSX.readFile(file, { cellDates: true });
  } else {
    console.warn("[qc:export] No source Excel — writing summary-only workbook");
    wb = XLSX.utils.book_new();
  }

  let updated = 0;
  if (file && fs.existsSync(file)) {
    for (const sheetName of wb.SheetNames) {
      if (SKIP_SHEETS.has(sheetName)) continue;
      if (args.sheet && String(sheetName).toLowerCase() !== args.sheet.toLowerCase()) continue;
      const ws = wb.Sheets[sheetName];
      const sheetRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
      let headerIdx = -1;
      let idCol = -1;
      let autoCol = -1;
      let statusCol = -1;
      let kqCol = -1;
      let scriptCol = -1;

      for (let i = 0; i < Math.min(sheetRows.length, 20); i++) {
        const row = sheetRows[i] || [];
        row.forEach((cell, idx) => {
          const h = normHeader(cell);
          if (h === "testcase id") {
            headerIdx = i;
            idCol = idx;
          }
          if (h === "automated") autoCol = idx;
          if (h === "status") statusCol = idx;
          if (h === "kq script") kqCol = idx;
          if (h === "script") scriptCol = idx;
        });
        if (headerIdx >= 0) break;
      }
      if (headerIdx < 0 || idCol < 0) continue;

      for (let r = headerIdx + 1; r < sheetRows.length; r++) {
        const id = sheetRows[r]?.[idCol];
        if (!id || !byId.has(String(id).trim())) continue;
        const res = byId.get(String(id).trim());
        const status = excelStatus(res.status);
        const addr = (c, row) => XLSX.utils.encode_cell({ c, r: row });
        if (autoCol >= 0) ws[addr(autoCol, r)] = { t: "s", v: "Yes" };
        if (kqCol >= 0) ws[addr(kqCol, r)] = { t: "s", v: status };
        if (statusCol >= 0) ws[addr(statusCol, r)] = { t: "s", v: status };
        const impl = scan.byId.get(String(id).trim());
        if (scriptCol >= 0 && impl?.file) {
          ws[addr(scriptCol, r)] = { t: "s", v: `${impl.file}:${impl.line}` };
        }
        updated++;
      }
    }
  }

  // Rich summary sheet
  const summaryAoA = [
    ["Generated At", results.generatedAt || new Date().toISOString()],
    ["Filter Sheet", args.sheet || "(all)"],
    ["Result Rows", rows.length],
    [],
    [
      "Testcase ID",
      "Sheet",
      "Priority",
      "Group",
      "Title",
      "KQ Script",
      "Status",
      "Duration (ms)",
      "Spec",
      "Suspicious Empty",
      "Error",
      "Attachments",
    ],
  ];

  for (const r of rows) {
    const meta = catalogById.get(r.qcId) || {};
    const impl = scan.byId.get(r.qcId);
    summaryAoA.push([
      r.qcId,
      meta.sheet || "",
      meta.priority || "",
      meta.group || "",
      meta.title || r.title || "",
      excelStatus(r.status),
      r.status,
      r.durationMs ?? "",
      impl ? `${impl.file}:${impl.line}` : r.file || "",
      impl?.suspiciousEmpty ? "Yes" : "",
      r.error || "",
      (r.attachments || []).join("\n"),
    ]);
  }

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryAoA);
  if (wb.SheetNames.includes("QC Run Summary")) {
    delete wb.Sheets["QC Run Summary"];
    wb.SheetNames = wb.SheetNames.filter((n) => n !== "QC Run Summary");
  }
  XLSX.utils.book_append_sheet(wb, summaryWs, "QC Run Summary");

  const out = path.join(KIT_ROOT, "qc/results.xlsx");
  XLSX.writeFile(wb, out);
  console.log(`[qc:export] updated ${updated} source-row(s) + summary → ${out}`);
}

main();
