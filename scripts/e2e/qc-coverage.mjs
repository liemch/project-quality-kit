#!/usr/bin/env node
/**
 * Build QC coverage dashboard: qc/coverage.json + qc/coverage.html
 *
 * Usage:
 *   npm run qc:coverage
 *   npm run qc:coverage -- --open   # print file:// hint
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectCfg } from "../lib/load-project-cfg.mjs";
import { scanQcSpecs } from "../lib/scan-qc-specs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname, "../..");

function parseArgs(argv) {
  return { open: argv.includes("--open") };
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadProjectCfg(KIT_ROOT);
  const catalogPath = path.resolve(KIT_ROOT, cfg.qc?.catalog_out || "qc/catalog.json");
  const resultsPath = path.resolve(KIT_ROOT, cfg.qc?.results_out || "qc/results.json");

  const catalog = fs.existsSync(catalogPath)
    ? JSON.parse(fs.readFileSync(catalogPath, "utf8"))
    : { count: 0, cases: [] };
  const scan = scanQcSpecs(KIT_ROOT);
  const lastById = new Map();
  if (fs.existsSync(resultsPath)) {
    const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
    for (const r of results.rows || []) lastById.set(r.qcId, r);
  }

  const bySheet = new Map();
  const cases = (catalog.cases || []).map((c) => {
    const impl = scan.byId.get(c.id);
    let status = "missing";
    if (impl?.kind === "implemented") status = "implemented";
    else if (impl?.kind === "stub") status = "stub";
    const last = lastById.get(c.id);
    const row = {
      id: c.id,
      title: c.title,
      sheet: c.sheet || "",
      priority: c.priority || "",
      group: c.group || "",
      status,
      suspiciousEmpty: !!impl?.suspiciousEmpty,
      file: impl?.file || "",
      lastResult: last?.status || "",
      lastError: last?.error || "",
      durationMs: last?.durationMs || 0,
    };
    const sheet = row.sheet || "(no sheet)";
    if (!bySheet.has(sheet)) {
      bySheet.set(sheet, { sheet, total: 0, stub: 0, implemented: 0, missing: 0, passed: 0, failed: 0, skipped: 0 });
    }
    const s = bySheet.get(sheet);
    s.total++;
    s[status]++;
    if (row.lastResult === "passed") s.passed++;
    else if (row.lastResult === "failed" || row.lastResult === "timedOut") s.failed++;
    else if (row.lastResult === "skipped") s.skipped++;
    return row;
  });

  const summary = {
    catalog: catalog.count || cases.length,
    stub: cases.filter((c) => c.status === "stub").length,
    implemented: cases.filter((c) => c.status === "implemented").length,
    missing: cases.filter((c) => c.status === "missing").length,
    suspiciousEmpty: cases.filter((c) => c.suspiciousEmpty).length,
    lastPassed: cases.filter((c) => c.lastResult === "passed").length,
    lastFailed: cases.filter((c) => c.lastResult === "failed" || c.lastResult === "timedOut").length,
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    project: cfg.project?.name || cfg.project?.code || path.basename(KIT_ROOT),
    summary,
    sheets: [...bySheet.values()].sort((a, b) => a.sheet.localeCompare(b.sheet)),
    cases,
  };

  const outJson = path.join(KIT_ROOT, "qc/coverage.json");
  const outHtml = path.join(KIT_ROOT, "qc/coverage.html");
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(payload, null, 2));

  const sheetRows = payload.sheets
    .map(
      (s) => `<tr>
      <td>${esc(s.sheet)}</td>
      <td>${s.total}</td>
      <td class="ok">${s.implemented}</td>
      <td class="stub">${s.stub}</td>
      <td>${s.missing}</td>
      <td class="ok">${s.passed}</td>
      <td class="fail">${s.failed}</td>
    </tr>`,
    )
    .join("\n");

  const caseRows = cases
    .map((c) => {
      const cls =
        c.lastResult === "passed"
          ? "ok"
          : c.lastResult === "failed" || c.lastResult === "timedOut"
            ? "fail"
            : c.status === "stub"
              ? "stub"
              : "";
      return `<tr class="${cls}">
      <td><code>${esc(c.id)}</code></td>
      <td>${esc(c.sheet)}</td>
      <td>${esc(c.priority)}</td>
      <td>${esc(c.status)}${c.suspiciousEmpty ? " ⚠ empty" : ""}</td>
      <td>${esc(c.lastResult || "—")}</td>
      <td>${esc(c.title)}</td>
    </tr>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>QC Coverage — ${esc(payload.project)}</title>
  <style>
    :root { color-scheme: light dark; --bg:#0f1419; --card:#1a2332; --text:#e7ecf3; --muted:#9aa7b8; --ok:#3ecf8e; --fail:#ff6b6b; --stub:#f0b429; --line:#2a3548; }
    @media (prefers-color-scheme: light) {
      :root { --bg:#f6f8fb; --card:#fff; --text:#1b2430; --muted:#5b6b7c; --line:#e6ebf2; }
    }
    body { margin:0; font:14px/1.45 system-ui,sans-serif; background:var(--bg); color:var(--text); }
    main { max-width:1100px; margin:0 auto; padding:24px 16px 48px; }
    h1 { font-size:1.4rem; margin:0 0 4px; }
    .muted { color:var(--muted); }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin:16px 0 24px; }
    .card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px; }
    .card b { display:block; font-size:1.35rem; }
    .ok { color:var(--ok); } .fail { color:var(--fail); } .stub { color:var(--stub); }
    table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; margin-bottom:28px; }
    th,td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
    th { font-size:12px; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); }
    code { font-size:12px; }
  </style>
</head>
<body>
<main>
  <h1>QC Coverage — ${esc(payload.project)}</h1>
  <p class="muted">Generated ${esc(payload.generatedAt)} · catalog ${summary.catalog}</p>
  <div class="cards">
    <div class="card"><span class="muted">Implemented</span><b class="ok">${summary.implemented}</b></div>
    <div class="card"><span class="muted">Stub (fixme)</span><b class="stub">${summary.stub}</b></div>
    <div class="card"><span class="muted">Missing</span><b>${summary.missing}</b></div>
    <div class="card"><span class="muted">Last Pass</span><b class="ok">${summary.lastPassed}</b></div>
    <div class="card"><span class="muted">Last Fail</span><b class="fail">${summary.lastFailed}</b></div>
    <div class="card"><span class="muted">Empty-pass?</span><b class="fail">${summary.suspiciousEmpty}</b></div>
  </div>
  <h2>By sheet</h2>
  <table>
    <thead><tr><th>Sheet</th><th>Total</th><th>Impl</th><th>Stub</th><th>Missing</th><th>Pass</th><th>Fail</th></tr></thead>
    <tbody>${sheetRows || "<tr><td colspan=7>No catalog</td></tr>"}</tbody>
  </table>
  <h2>All cases</h2>
  <table>
    <thead><tr><th>ID</th><th>Sheet</th><th>Prio</th><th>Status</th><th>Last run</th><th>Title</th></tr></thead>
    <tbody>${caseRows || "<tr><td colspan=6>No cases</td></tr>"}</tbody>
  </table>
</main>
</body>
</html>`;

  fs.writeFileSync(outHtml, html);
  console.log(`[qc:coverage] ${outJson}`);
  console.log(`[qc:coverage] ${outHtml}`);
  console.log(
    `[qc:coverage] implemented ${summary.implemented}/${summary.catalog}, stub ${summary.stub}, last pass ${summary.lastPassed}, fail ${summary.lastFailed}`,
  );
  if (args.open) console.log(`[qc:coverage] open: file://${outHtml}`);
}

main();
