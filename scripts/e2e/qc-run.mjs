#!/usr/bin/env node
/**
 * Run Playwright tests filtered by QC catalog / Testcase ID / priority / group / status.
 *
 * Usage:
 *   npm run qc:run -- --id TC_03.1
 *   npm run qc:run -- --priority High --headed
 *   npm run qc:run -- --sheet Template --priority High
 *   npm run qc:run -- --status failed          # re-run last Fail/timedOut
 *   npm run qc:run -- --status stub --dry-run  # list stubs that would match
 *   npm run qc:run -- --id TC_10.18 --allow-empty
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanQcSpecs } from "../lib/scan-qc-specs.mjs";
import { loadProjectCfg } from "../lib/load-project-cfg.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname, "../..");

function parseArgs(argv) {
  const out = {
    id: "",
    priority: "",
    group: "",
    sheet: "",
    status: "", // stub | implemented | missing | failed | passed | skipped | empty
    grep: "",
    project: "mock",
    headed: false,
    ui: false,
    observe: false,
    slowmo: "",
    allowEmpty: false,
    strictEmpty: false,
    dryRun: false,
  };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id") out.id = argv[++i];
    else if (a === "--priority") out.priority = argv[++i];
    else if (a === "--group") out.group = argv[++i];
    else if (a === "--sheet") out.sheet = argv[++i];
    else if (a === "--status") out.status = argv[++i];
    else if (a === "--grep") out.grep = argv[++i];
    else if (a === "--project") out.project = argv[++i];
    else if (a === "--headed") out.headed = true;
    else if (a === "--ui") out.ui = true;
    else if (a === "--observe") out.observe = true;
    else if (a === "--slowmo") out.slowmo = argv[++i];
    else if (a === "--allow-empty") out.allowEmpty = true;
    else if (a === "--strict-empty") out.strictEmpty = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "-h" || a === "--help") {
      console.log(`Usage: qc:run [filters] [display] [--dry-run]

Filters:
  --id TC_x.y | --sheet NAME | --priority High | --group Functional
  --status stub|implemented|missing|failed|passed|skipped|empty
  --grep REGEX

Display: --headed | --observe | --ui | --project mock|chromium | --slowmo N
Guards:  --strict-empty | --allow-empty
Other:   --dry-run   list matched ids and exit (no Playwright)`);
      process.exit(0);
    } else rest.push(a);
  }
  out.rest = rest;
  return out;
}

function loadResults(cfg) {
  const resultsPath = path.resolve(KIT_ROOT, cfg.qc?.results_out || "qc/results.json");
  const lastById = new Map();
  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
      for (const r of results.rows || []) lastById.set(r.qcId, r);
    } catch {
      /* ignore */
    }
  }
  return lastById;
}

function loadCatalogCases(cfg, catalogPath) {
  if (!fs.existsSync(catalogPath)) return null;
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  return catalog.cases || [];
}

function resolveIds(args, cfg) {
  const catalogPath = path.resolve(KIT_ROOT, cfg.qc?.catalog_out || "qc/catalog.json");
  const scan = scanQcSpecs(KIT_ROOT);
  const lastById = loadResults(cfg);
  const catalogCases = loadCatalogCases(cfg, catalogPath);

  const needsCatalog =
    !!(args.priority || args.group || args.sheet) ||
    ["stub", "implemented", "missing", "failed", "passed", "skipped", "empty"].includes(
      String(args.status || "").toLowerCase(),
    );

  if (args.id) {
    let ids = [args.id];
    if (args.status) {
      ids = filterByStatus(ids, args.status, scan, lastById, catalogCases);
    }
    return { ids, scan, lastById };
  }

  if (needsCatalog || args.status) {
    // Prefer catalog rows; if no catalog but status is run-result based, use results/scan
    let pool = [];
    if (catalogCases) {
      pool = catalogCases.map((c) => ({
        id: c.id,
        priority: c.priority,
        group: c.group,
        sheet: c.sheet,
      }));
    } else if (["failed", "passed", "skipped", "empty", "stub", "implemented"].includes(
      String(args.status || "").toLowerCase(),
    )) {
      const ids = new Set([...lastById.keys(), ...scan.byId.keys()]);
      pool = [...ids].map((id) => ({ id, priority: "", group: "", sheet: "" }));
    } else {
      console.error("[qc:run] Catalog filter used but no catalog at", catalogPath);
      console.error("[qc:run] Run /quality-qc-import (or npm run qc:import:py) first.");
      process.exit(1);
    }

    let rows = pool;
    if (args.priority) {
      rows = rows.filter((c) => String(c.priority).toLowerCase() === args.priority.toLowerCase());
    }
    if (args.group) {
      rows = rows.filter((c) => String(c.group).toLowerCase() === args.group.toLowerCase());
    }
    if (args.sheet) {
      rows = rows.filter((c) => String(c.sheet).toLowerCase() === args.sheet.toLowerCase());
    }
    let ids = rows.map((c) => c.id);
    if (args.status) {
      ids = filterByStatus(ids, args.status, scan, lastById, catalogCases);
    }
    console.log(`[qc:run] filter matched ${ids.length} id(s)`);
    if (!ids.length) {
      console.error("[qc:run] No cases matched filter — refusing to run full suite.");
      process.exit(1);
    }
    return { ids, scan, lastById };
  }

  return { ids: [], scan, lastById };
}

function implStatus(id, scan) {
  const impl = scan.byId.get(id);
  if (impl?.kind === "implemented") return "implemented";
  if (impl?.kind === "stub") return "stub";
  return "missing";
}

function filterByStatus(ids, statusRaw, scan, lastById, _catalogCases) {
  const status = String(statusRaw).toLowerCase();
  return ids.filter((id) => {
    const impl = implStatus(id, scan);
    const last = lastById.get(id)?.status || "";
    const empty = !!scan.byId.get(id)?.suspiciousEmpty;
    if (status === "stub") return impl === "stub";
    if (status === "implemented") return impl === "implemented";
    if (status === "missing") return impl === "missing";
    if (status === "empty") return empty;
    if (status === "passed") return last === "passed";
    if (status === "skipped") return last === "skipped";
    if (status === "failed") return last === "failed" || last === "timedOut" || last === "interrupted";
    console.warn(`[qc:run] unknown --status ${statusRaw} (ignored for id filter)`);
    return true;
  });
}

function guardEmptyPass(ids, args, scan) {
  if (args.allowEmpty) return;
  const bad = [];
  const targets = ids.length ? ids : [...scan.byId.keys()];
  for (const id of targets) {
    const info = scan.byId.get(id);
    if (info?.suspiciousEmpty) bad.push(info);
  }
  if (!bad.length) return;
  console.warn("[qc:run] WARN empty-pass suspects (implemented but no expect/assert):");
  for (const b of bad) {
    console.warn(`  - ${b.id}  ${b.file}:${b.line}`);
  }
  console.warn("[qc:run] These can report Playwright 'passed' without checking the system.");
  console.warn("[qc:run] Fix with /quality-qc-implement, or pass --allow-empty to ignore.");
  if (args.strictEmpty || process.env.QC_STRICT_EMPTY === "1") {
    console.error("[qc:run] Refusing to run (--strict-empty / QC_STRICT_EMPTY=1).");
    process.exit(2);
  }
}

function printDryRun(ids, scan, lastById) {
  console.log(`[qc:run] dry-run — ${ids.length} id(s) would run:`);
  for (const id of ids) {
    const impl = implStatus(id, scan);
    const last = lastById.get(id)?.status || "—";
    const file = scan.byId.get(id)?.file || "";
    const empty = scan.byId.get(id)?.suspiciousEmpty ? " ⚠ empty" : "";
    console.log(`  ${id.padEnd(12)} ${impl.padEnd(12)} last=${last}${empty}${file ? "  " + file : ""}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadProjectCfg(KIT_ROOT);
  const { ids, scan, lastById } = resolveIds(args, cfg);

  if (args.dryRun) {
    if (!ids.length && !args.id && !args.status && !args.sheet && !args.priority && !args.group) {
      console.error("[qc:run] --dry-run needs a filter (--id / --sheet / --status / …)");
      process.exit(1);
    }
    printDryRun(ids, scan, lastById);
    process.exit(0);
  }

  guardEmptyPass(ids, args, scan);

  // Escape TC ids and forbid prefix matches (TC_03.1 must not match TC_03.10).
  const idGrep = (id) => `${String(id).replace(/\./g, "\\.")}(?!\\d)`;

  const grepParts = [];
  if (args.grep) grepParts.push(args.grep);
  if (ids.length === 1) grepParts.push(idGrep(ids[0]));
  else if (ids.length > 1) grepParts.push(`(${ids.map(idGrep).join("|")})`);

  const env = { ...process.env };
  if (args.observe) {
    env.PW_OBSERVE = "1";
    env.PW_SLOWMO = args.slowmo || env.PW_SLOWMO || "400";
    args.headed = true;
  } else if (args.slowmo) {
    env.PW_SLOWMO = args.slowmo;
  }

  const cmd = ["playwright", "test", `--project=${args.project}`];
  if (grepParts.length) cmd.push("-g", grepParts.join(".*"));
  if (args.ui) cmd.push("--ui");
  else if (args.headed) cmd.push("--headed");
  cmd.push(...args.rest);

  console.log("[qc:run]", "npx", cmd.join(" "));
  if (args.observe) console.log("[qc:run] observe: PW_OBSERVE=1 PW_SLOWMO=" + env.PW_SLOWMO);
  const r = spawnSync("npx", cmd, { cwd: KIT_ROOT, env, stdio: "inherit" });

  // Refresh coverage after a QC run (best-effort)
  try {
    spawnSync("node", [path.join(__dirname, "qc-coverage.mjs")], { cwd: KIT_ROOT, stdio: "inherit" });
  } catch {
    /* ignore */
  }

  process.exit(r.status ?? 1);
}

main();
