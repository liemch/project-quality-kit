#!/usr/bin/env node
/**
 * Build QC coverage dashboard: qc/coverage.json + qc/coverage.html
 *
 * Coverage v2: client-side filters, suspiciousEmpty badges, artifact links.
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

function artifactHref(attachment) {
  // format: "screenshot:/abs/path" or "trace:/abs/..."
  const idx = String(attachment).indexOf(":");
  if (idx < 0) return "";
  const name = attachment.slice(0, idx);
  const p = attachment.slice(idx + 1);
  if (!p) return "";
  const rel = path.relative(path.join(KIT_ROOT, "qc"), p).replace(/\\/g, "/");
  return { name, href: rel, missing: !fs.existsSync(p) };
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
    const attachments = (last?.attachments || [])
      .map(artifactHref)
      .filter(Boolean);
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
      attachments,
      attachmentsMissing: !!last?.attachmentsMissing,
      updatedAt: last?.updatedAt || "",
    };
    const sheet = row.sheet || "(no sheet)";
    if (!bySheet.has(sheet)) {
      bySheet.set(sheet, {
        sheet,
        total: 0,
        stub: 0,
        implemented: 0,
        missing: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        empty: 0,
      });
    }
    const s = bySheet.get(sheet);
    s.total++;
    s[status]++;
    if (row.suspiciousEmpty) s.empty++;
    if (row.lastResult === "passed") s.passed++;
    else if (row.lastResult === "failed" || row.lastResult === "timedOut") s.failed++;
    else if (row.lastResult === "skipped") s.skipped++;
    return row;
  });

  // Orphan implemented specs not in catalog (e.g. golden on Base)
  for (const [id, impl] of scan.byId) {
    if (cases.some((c) => c.id === id)) continue;
    const last = lastById.get(id);
    const attachments = (last?.attachments || []).map(artifactHref).filter(Boolean);
    cases.push({
      id,
      title: `(spec) ${id}`,
      sheet: "(from specs)",
      priority: "",
      group: "",
      status: impl.kind === "implemented" ? "implemented" : "stub",
      suspiciousEmpty: !!impl.suspiciousEmpty,
      file: impl.file || "",
      lastResult: last?.status || "",
      lastError: last?.error || "",
      durationMs: last?.durationMs || 0,
      attachments,
      attachmentsMissing: !!last?.attachmentsMissing,
      updatedAt: last?.updatedAt || "",
      orphan: true,
    });
  }

  const summary = {
    catalog: catalog.count || (catalog.cases || []).length,
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
    version: 2,
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
      <td class="fail">${s.empty || 0}</td>
    </tr>`,
    )
    .join("\n");

  const caseRows = cases
    .map((c) => {
      const cls =
        c.suspiciousEmpty
          ? "empty"
          : c.lastResult === "passed"
            ? "ok"
            : c.lastResult === "failed" || c.lastResult === "timedOut"
              ? "fail"
              : c.status === "stub"
                ? "stub"
                : "";
      const statusHtml = c.suspiciousEmpty
        ? `${esc(c.status)} <span class="badge empty-badge" title="Implemented without expect()">empty-pass</span>`
        : esc(c.status);
      const arts = (c.attachments || [])
        .map((a) =>
          a.missing
            ? `<span class="muted" title="pruned">${esc(a.name)}∅</span>`
            : `<a href="${esc(a.href)}" target="_blank" rel="noopener">${esc(a.name)}</a>`,
        )
        .join(" ");
      const artCell =
        arts ||
        (c.attachmentsMissing ? `<span class="muted">pruned</span>` : "—");
      const err = c.lastError
        ? `<div class="err" title="${esc(c.lastError)}">${esc(String(c.lastError).slice(0, 120))}</div>`
        : "";
      return `<tr class="${cls}"
        data-id="${esc(c.id)}"
        data-sheet="${esc(c.sheet)}"
        data-priority="${esc(c.priority)}"
        data-status="${esc(c.status)}"
        data-last="${esc(c.lastResult || "")}"
        data-empty="${c.suspiciousEmpty ? "1" : "0"}"
        data-title="${esc(c.title)}">
      <td><code>${esc(c.id)}</code></td>
      <td>${esc(c.sheet)}</td>
      <td>${esc(c.priority)}</td>
      <td>${statusHtml}</td>
      <td>${esc(c.lastResult || "—")}${err}</td>
      <td class="arts">${artCell}</td>
      <td>${esc(c.title)}</td>
    </tr>`;
    })
    .join("\n");

  const sheetsOpts = [...new Set(cases.map((c) => c.sheet).filter(Boolean))]
    .sort()
    .map((s) => `<option value="${esc(s)}">${esc(s)}</option>`)
    .join("");
  const prioOpts = [...new Set(cases.map((c) => c.priority).filter(Boolean))]
    .sort()
    .map((s) => `<option value="${esc(s)}">${esc(s)}</option>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>QC Coverage — ${esc(payload.project)}</title>
  <style>
    :root { color-scheme: light dark; --bg:#0f1419; --card:#1a2332; --text:#e7ecf3; --muted:#9aa7b8; --ok:#3ecf8e; --fail:#ff6b6b; --stub:#f0b429; --line:#2a3548; --empty:#ff8c42; }
    @media (prefers-color-scheme: light) {
      :root { --bg:#f6f8fb; --card:#fff; --text:#1b2430; --muted:#5b6b7c; --line:#e6ebf2; }
    }
    body { margin:0; font:14px/1.45 system-ui,sans-serif; background:var(--bg); color:var(--text); }
    main { max-width:1200px; margin:0 auto; padding:24px 16px 48px; }
    h1 { font-size:1.4rem; margin:0 0 4px; }
    .muted { color:var(--muted); }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin:16px 0 20px; }
    .card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px; }
    .card b { display:block; font-size:1.35rem; }
    .ok { color:var(--ok); } .fail { color:var(--fail); } .stub { color:var(--stub); } .empty { color:var(--empty); }
    .filters { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:0 0 16px; padding:12px; background:var(--card); border:1px solid var(--line); border-radius:10px; }
    .filters label { font-size:12px; color:var(--muted); display:flex; flex-direction:column; gap:4px; }
    .filters input, .filters select { font:inherit; padding:6px 8px; border-radius:6px; border:1px solid var(--line); background:var(--bg); color:var(--text); min-width:120px; }
    .filters .count { margin-left:auto; color:var(--muted); font-size:12px; }
    table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; margin-bottom:28px; }
    th,td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
    th { font-size:12px; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); }
    code { font-size:12px; }
    a { color:var(--ok); }
    .badge { display:inline-block; font-size:10px; padding:1px 6px; border-radius:999px; vertical-align:middle; }
    .empty-badge { background:color-mix(in srgb, var(--empty) 25%, transparent); color:var(--empty); border:1px solid var(--empty); }
    tr.empty { background:color-mix(in srgb, var(--empty) 8%, transparent); }
    .err { font-size:11px; color:var(--fail); max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .arts { font-size:12px; white-space:nowrap; }
    tr.hidden { display:none; }
  </style>
</head>
<body>
<main>
  <h1>QC Coverage — ${esc(payload.project)}</h1>
  <p class="muted">Generated ${esc(payload.generatedAt)} · catalog ${summary.catalog} · dashboard v2</p>
  <div class="cards">
    <div class="card"><span class="muted">Implemented</span><b class="ok">${summary.implemented}</b></div>
    <div class="card"><span class="muted">Stub (fixme)</span><b class="stub">${summary.stub}</b></div>
    <div class="card"><span class="muted">Missing</span><b>${summary.missing}</b></div>
    <div class="card"><span class="muted">Last Pass</span><b class="ok">${summary.lastPassed}</b></div>
    <div class="card"><span class="muted">Last Fail</span><b class="fail">${summary.lastFailed}</b></div>
    <div class="card"><span class="muted">Empty-pass?</span><b class="fail">${summary.suspiciousEmpty}</b></div>
  </div>

  <div class="filters" id="filters">
    <label>Search<input type="search" id="q" placeholder="id / title…" /></label>
    <label>Sheet<select id="sheet"><option value="">All</option>${sheetsOpts}</select></label>
    <label>Priority<select id="prio"><option value="">All</option>${prioOpts}</select></label>
    <label>Status<select id="status">
      <option value="">All</option>
      <option value="implemented">implemented</option>
      <option value="stub">stub</option>
      <option value="missing">missing</option>
    </select></label>
    <label>Last run<select id="last">
      <option value="">All</option>
      <option value="passed">passed</option>
      <option value="failed">failed</option>
      <option value="skipped">skipped</option>
      <option value="none">no run</option>
    </select></label>
    <label style="flex-direction:row;align-items:center;gap:6px;margin-top:14px">
      <input type="checkbox" id="emptyOnly" /> Empty-pass only
    </label>
    <span class="count" id="shownCount"></span>
  </div>

  <h2>By sheet</h2>
  <table>
    <thead><tr><th>Sheet</th><th>Total</th><th>Impl</th><th>Stub</th><th>Missing</th><th>Pass</th><th>Fail</th><th>Empty</th></tr></thead>
    <tbody>${sheetRows || "<tr><td colspan=8>No catalog</td></tr>"}</tbody>
  </table>
  <h2>All cases</h2>
  <table>
    <thead><tr><th>ID</th><th>Sheet</th><th>Prio</th><th>Status</th><th>Last run</th><th>Artifacts</th><th>Title</th></tr></thead>
    <tbody id="caseBody">${caseRows || "<tr><td colspan=7>No cases</td></tr>"}</tbody>
  </table>
</main>
<script>
(function () {
  const q = document.getElementById("q");
  const sheet = document.getElementById("sheet");
  const prio = document.getElementById("prio");
  const status = document.getElementById("status");
  const last = document.getElementById("last");
  const emptyOnly = document.getElementById("emptyOnly");
  const body = document.getElementById("caseBody");
  const shownCount = document.getElementById("shownCount");
  function apply() {
    const rows = [...body.querySelectorAll("tr[data-id]")];
    let n = 0;
    const qq = (q.value || "").trim().toLowerCase();
    for (const tr of rows) {
      let ok = true;
      if (qq) {
        const hay = (tr.dataset.id + " " + tr.dataset.title).toLowerCase();
        if (!hay.includes(qq)) ok = false;
      }
      if (sheet.value && tr.dataset.sheet !== sheet.value) ok = false;
      if (prio.value && tr.dataset.priority !== prio.value) ok = false;
      if (status.value && tr.dataset.status !== status.value) ok = false;
      if (last.value === "none" && tr.dataset.last) ok = false;
      else if (last.value === "failed" && !/^(failed|timedOut)$/.test(tr.dataset.last || "")) ok = false;
      else if (last.value && last.value !== "none" && last.value !== "failed" && tr.dataset.last !== last.value) ok = false;
      if (emptyOnly.checked && tr.dataset.empty !== "1") ok = false;
      tr.classList.toggle("hidden", !ok);
      if (ok) n++;
    }
    shownCount.textContent = "Showing " + n + " / " + rows.length;
  }
  for (const el of [q, sheet, prio, status, last, emptyOnly]) {
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
  }
  apply();
})();
</script>
</body>
</html>`;

  fs.writeFileSync(outHtml, html);
  console.log(`[qc:coverage] ${outJson}`);
  console.log(`[qc:coverage] ${outHtml}`);
  console.log(
    `[qc:coverage] implemented ${summary.implemented}/${summary.catalog || cases.length}, stub ${summary.stub}, last pass ${summary.lastPassed}, fail ${summary.lastFailed}, empty ${summary.suspiciousEmpty}`,
  );
  if (args.open) console.log(`[qc:coverage] open: file://${outHtml}`);
}

main();
