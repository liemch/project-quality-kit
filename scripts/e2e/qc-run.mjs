#!/usr/bin/env node
/**
 * Run Playwright tests filtered by QC catalog / Testcase ID / priority / group.
 *
 * Usage:
 *   npm run qc:run -- --id TC_03.1
 *   npm run qc:run -- --priority High --headed
 *   npm run qc:run -- --id TC_03.1 --observe
 *   npm run qc:run -- --group Functional --ui
 *   npm run qc:run -- --sheet Template --priority High
 *   npm run qc:run -- --id TC_10.18 --allow-empty   # skip empty-pass guard
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { scanQcSpecs } from "../lib/scan-qc-specs.mjs";

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname, "../..");

function loadProjectCfg() {
  const jsonPath = path.join(KIT_ROOT, "_meta/project.json");
  if (fs.existsSync(jsonPath)) return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  try {
    const yaml = require("js-yaml");
    return yaml.load(fs.readFileSync(path.join(KIT_ROOT, "_meta/project.yml"), "utf8"));
  } catch (e) {
    throw new Error("Need _meta/project.json or js-yaml to read project.yml: " + e.message);
  }
}

function parseArgs(argv) {
  const out = {
    id: "",
    priority: "",
    group: "",
    sheet: "",
    grep: "",
    project: "mock",
    headed: false,
    ui: false,
    observe: false,
    slowmo: "",
    allowEmpty: false,
    strictEmpty: false,
  };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id") out.id = argv[++i];
    else if (a === "--priority") out.priority = argv[++i];
    else if (a === "--group") out.group = argv[++i];
    else if (a === "--sheet") out.sheet = argv[++i];
    else if (a === "--grep") out.grep = argv[++i];
    else if (a === "--project") out.project = argv[++i];
    else if (a === "--headed") out.headed = true;
    else if (a === "--ui") out.ui = true;
    else if (a === "--observe") out.observe = true;
    else if (a === "--slowmo") out.slowmo = argv[++i];
    else if (a === "--allow-empty") out.allowEmpty = true;
    else if (a === "--strict-empty") out.strictEmpty = true;
    else rest.push(a);
  }
  out.rest = rest;
  return out;
}

function guardEmptyPass(ids, args) {
  if (args.allowEmpty) return;
  const scan = scanQcSpecs(KIT_ROOT);
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadProjectCfg();
  const catalogPath = path.resolve(KIT_ROOT, cfg.qc?.catalog_out || "qc/catalog.json");

  let ids = [];
  if (args.id) {
    ids = [args.id];
  } else if (args.priority || args.group || args.sheet) {
    if (!fs.existsSync(catalogPath)) {
      console.error("[qc:run] Catalog filter used but no catalog at", catalogPath);
      console.error("[qc:run] Run /quality-qc-import (or npm run qc:import:py) first.");
      process.exit(1);
    }
    const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    ids = (catalog.cases || [])
      .filter((c) => !args.priority || String(c.priority).toLowerCase() === args.priority.toLowerCase())
      .filter((c) => !args.group || String(c.group).toLowerCase() === args.group.toLowerCase())
      .filter((c) => !args.sheet || String(c.sheet).toLowerCase() === args.sheet.toLowerCase())
      .map((c) => c.id);
    console.log(`[qc:run] catalog filter matched ${ids.length} id(s)`);
    if (!ids.length) {
      console.error("[qc:run] No cases matched filter — refusing to run full suite.");
      process.exit(1);
    }
  }

  guardEmptyPass(ids, args);

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
