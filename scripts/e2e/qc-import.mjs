#!/usr/bin/env node
/**
 * Import ISC QC Excel → qc/catalog.json
 * VI: Đọc sheet chức năng (bỏ Cover/Guideline/Summary/…), lấy cột Testcase ID + metadata.
 * EN: Reads feature sheets, extracts Testcase ID + metadata into a catalog.
 *
 * Usage:
 *   npm run qc:import -- --file ../path/to/ISC_*_TestCase.xlsx
 *   npm run qc:import -- --file qc/input/cases.xlsx --priority High
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { assertNotBaseTemplate } from "../lib/refuse-base.mjs";
import { loadProjectCfg } from "../lib/load-project-cfg.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname, "../..");
assertNotBaseTemplate(KIT_ROOT, "qc:import");

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
  const out = { file: "", priority: "", group: "", sheet: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") out.file = argv[++i];
    else if (a === "--priority") out.priority = argv[++i];
    else if (a === "--group") out.group = argv[++i];
    else if (a === "--sheet") out.sheet = argv[++i];
  }
  return out;
}

function loadCfg() {
  return loadProjectCfg(KIT_ROOT);
}

function normHeader(cell) {
  let s = String(cell ?? "")
    .replace(/\n/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  s = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return s;
}

function headerIndex(row) {
  const map = {};
  row.forEach((cell, idx) => {
    if (cell == null) return;
    const key = normHeader(cell);
    if (key) map[key] = idx;
  });
  return map;
}

function col(map, row, ...names) {
  for (const n of names) {
    const idx = map[n.toLowerCase()];
    if (idx != null && row[idx] != null) return String(row[idx]).trim();
  }
  return "";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadCfg();
  let file = args.file;
  if (!file) {
    const inputDir = path.join(KIT_ROOT, "qc/input");
    const files = fs.existsSync(inputDir)
      ? fs.readdirSync(inputDir).filter((f) => f.endsWith(".xlsx") && !f.startsWith("~"))
      : [];
    if (!files.length) {
      console.error("[qc:import] Provide --file <xlsx> or place a file in qc/input/");
      process.exit(1);
    }
    file = path.join(inputDir, files[0]);
  }
  file = path.resolve(file);
  if (!fs.existsSync(file)) {
    console.error("[qc:import] File not found:", file);
    process.exit(1);
  }

  const wb = XLSX.readFile(file, { cellDates: true });
  const cases = [];

  for (const sheetName of wb.SheetNames) {
    if (SKIP_SHEETS.has(sheetName)) continue;
    if (args.sheet && sheetName !== args.sheet) continue;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
    // Find header row containing "Testcase ID"
    let headerRowIdx = -1;
    let map = {};
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const joined = (rows[i] || []).map((c) => String(c ?? "")).join(" | ");
      if (/testcase\s*id/i.test(joined)) {
        headerRowIdx = i;
        map = headerIndex(rows[i]);
        break;
      }
    }
    if (headerRowIdx < 0) continue;

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const id = col(map, row, "testcase id");
      if (!id || !/^TC_/i.test(id)) continue;
      const priority = col(map, row, "priority");
      const group = col(map, row, "group");
      if (args.priority && !priority.toLowerCase().includes(args.priority.toLowerCase())) continue;
      if (args.group && group.toLowerCase() !== args.group.toLowerCase()) continue;

      cases.push({
        id,
        reqId: col(map, row, "req id"),
        docSource: col(map, row, "doc source"),
        group,
        priority,
        title: col(map, row, "test title"),
        precondition: col(map, row, "pre-condition"),
        steps: col(map, row, "test steps"),
        expected: col(map, row, "expected result"),
        origin: col(map, row, "origin"),
        sheet: sheetName,
        automated: col(map, row, "automated"),
        script: col(map, row, "script"),
      });
    }
  }

  const outRel = cfg.qc?.catalog_out || "qc/catalog.json";
  const out = path.resolve(KIT_ROOT, outRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const payload = {
    source: file,
    importedAt: new Date().toISOString(),
    count: cases.length,
    cases,
  };
  fs.writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(`[qc:import] ${cases.length} case(s) → ${out}`);
  const byPri = cases.reduce((acc, c) => {
    const k = c.priority || "?";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const byGroup = cases.reduce((acc, c) => {
    const k = c.group || "?";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  console.log("[qc:import] by priority:", byPri);
  console.log("[qc:import] by group:", byGroup);
}

main();
