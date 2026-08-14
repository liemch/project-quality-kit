#!/usr/bin/env node
/**
 * Print a markdown wave report for /quality-qc-implement batch results.
 *
 * Reads qc/results.json (+ optional catalog) and prints a standup-ready table.
 *
 * Usage:
 *   npm run qc:wave-report
 *   npm run qc:wave-report -- --sheet Template --priority High
 *   npm run qc:wave-report -- --ids TC_01.1,TC_01.2 --out qc/last-wave.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectCfg } from "../lib/load-project-cfg.mjs";
import { scanQcSpecs } from "../lib/scan-qc-specs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname, "../..");

function parseArgs(argv) {
  const out = { sheet: "", priority: "", group: "", ids: "", out: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sheet") out.sheet = argv[++i] || "";
    else if (a === "--priority") out.priority = argv[++i] || "";
    else if (a === "--group") out.group = argv[++i] || "";
    else if (a === "--ids") out.ids = argv[++i] || "";
    else if (a === "--out") out.out = argv[++i] || "";
    else if (a === "-h" || a === "--help") {
      console.log(`Usage: qc:wave-report [--sheet X] [--priority High] [--group G] [--ids TC_a,TC_b] [--out file.md]`);
      process.exit(0);
    }
  }
  return out;
}

function verdict(row, impl) {
  if (impl?.kind === "stub" || !impl) return "Skip";
  if (impl.suspiciousEmpty) return "Empty";
  if (!row) return "Skip";
  if (row.status === "passed") return "Pass";
  if (row.status === "skipped") return "Skip";
  if (row.status === "failed" || row.status === "timedOut" || row.status === "interrupted") return "Fail";
  return row.status || "Skip";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadProjectCfg(KIT_ROOT);
  const catalogPath = path.resolve(KIT_ROOT, cfg.qc?.catalog_out || "qc/catalog.json");
  const resultsPath = path.resolve(KIT_ROOT, cfg.qc?.results_out || "qc/results.json");
  const scan = scanQcSpecs(KIT_ROOT);
  const lastById = new Map();
  if (fs.existsSync(resultsPath)) {
    const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
    for (const r of results.rows || []) lastById.set(r.qcId, r);
  }

  let cases = [];
  if (args.ids) {
    cases = args.ids.split(/[,\s]+/).filter(Boolean).map((id) => ({ id, title: id, sheet: "", priority: "" }));
  } else if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    cases = (catalog.cases || []).filter((c) => {
      if (args.sheet && String(c.sheet).toLowerCase() !== args.sheet.toLowerCase()) return false;
      if (args.priority && String(c.priority).toLowerCase() !== args.priority.toLowerCase()) return false;
      if (args.group && String(c.group).toLowerCase() !== args.group.toLowerCase()) return false;
      return true;
    });
  } else {
    cases = [...scan.byId.keys()].map((id) => ({ id, title: id, sheet: "", priority: "" }));
  }

  const lines = [];
  lines.push(`# QC Wave Report`);
  lines.push("");
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Project: ${cfg.project?.name || cfg.project?.code || path.basename(KIT_ROOT)}`);
  if (args.sheet) lines.push(`- Sheet: ${args.sheet}`);
  if (args.priority) lines.push(`- Priority: ${args.priority}`);
  lines.push(`- Cases: ${cases.length}`);
  lines.push("");
  lines.push(`| TC | Result | Note |`);
  lines.push(`|----|--------|------|`);

  const counts = { Pass: 0, Fail: 0, Skip: 0, Empty: 0 };
  const blockers = [];

  for (const c of cases) {
    const impl = scan.byId.get(c.id);
    const row = lastById.get(c.id);
    const v = verdict(row, impl);
    counts[v] = (counts[v] || 0) + 1;
    let note = "";
    if (v === "Fail") {
      note = (row?.error || "see test-results/latest").split("\n")[0].slice(0, 100);
      blockers.push(`${c.id}: ${note}`);
    } else if (v === "Empty") {
      note = "empty-pass — add expect()";
      blockers.push(`${c.id}: empty-pass`);
    } else if (v === "Skip") {
      note =
        impl?.kind === "stub"
          ? "stub (test.fixme)"
          : impl?.kind === "implemented"
            ? "implemented, not run yet"
            : "missing spec";
    } else if (row?.durationMs) {
      note = `${row.durationMs}ms`;
    }
    lines.push(`| ${c.id} | **${v}** | ${note.replace(/\|/g, "/")} |`);
  }

  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`- Pass: ${counts.Pass || 0}`);
  lines.push(`- Fail: ${counts.Fail || 0}`);
  lines.push(`- Skip: ${counts.Skip || 0}`);
  lines.push(`- Empty-pass: ${counts.Empty || 0}`);
  lines.push("");
  if (blockers.length) {
    lines.push(`## Blockers`);
    lines.push("");
    for (const b of blockers) lines.push(`- ${b}`);
    lines.push("");
  }
  lines.push(`## Next`);
  lines.push("");
  lines.push(`- Fail → open \`test-results/latest/\` (screenshot / trace)`);
  lines.push(`- Skip stub → \`/quality-qc-implement --id …\``);
  lines.push(`- Empty → add meaningful \`expect(...)\``);
  lines.push(`- Coverage → \`npm run qc:coverage -- --open\``);
  lines.push(`- Export → \`npm run qc:export\``);
  lines.push("");

  const md = lines.join("\n");
  if (args.out) {
    const outPath = path.resolve(KIT_ROOT, args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, md);
    console.log(`[qc:wave-report] wrote ${outPath}`);
  }
  process.stdout.write(md);
}

main();
