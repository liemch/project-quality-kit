#!/usr/bin/env node
/**
 * Shared config loader for QC Node scripts (prefer project.json, then yml).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function loadProjectCfg(kitRoot) {
  const jsonPath = path.join(kitRoot, "_meta/project.json");
  if (fs.existsSync(jsonPath)) return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const ymlPath = path.join(kitRoot, "_meta/project.yml");
  if (fs.existsSync(ymlPath)) {
    const yaml = require("js-yaml");
    return yaml.load(fs.readFileSync(ymlPath, "utf8"));
  }
  const smokePath = path.join(kitRoot, "_meta/project.smoke.yml");
  if (fs.existsSync(smokePath)) {
    const yaml = require("js-yaml");
    return yaml.load(fs.readFileSync(smokePath, "utf8"));
  }
  return {};
}
