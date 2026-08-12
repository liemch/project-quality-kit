import fs from "node:fs";
import path from "node:path";

export type ProjectConfig = {
  project: { name: string; code: string };
  paths: { workspace_root: string; kb_dir: string; web_dir: string; api_dir: string };
  web: {
    service_id: string;
    http_port: number;
    base_path: string;
    package_manager: string;
    dev_command: string;
  };
  api: { service_id: string; http_port: number; route_prefix: string };
  auth: {
    strategy: string;
    cookie_name: string;
    local_storage_keys: string[];
    real: { token_env: string; login_url: string; token_endpoint: string };
  };
  session: {
    me: string;
    permissions: string;
    functions: string;
    my_apps: string;
    check_session: string;
    app_code: string;
    baseline_permission: { function_code: string; actions: string[] };
  };
  dto: { list_items_key: string; list_total_key: string; data_envelope: string };
  qc: {
    excel_glob: string;
    catalog_out: string;
    results_out: string;
    annotation_type: string;
  };
  features: {
    wire_web_scripts: boolean;
    wire_skills?: boolean;
    e2e: boolean;
    ai_review: boolean;
  };
};

let cached: ProjectConfig | null = null;

function isBaseTemplateDir(dir: string): boolean {
  return path.basename(dir) === "project-quality-kit";
}

/** Resolve kit root: project.yml/json, or Base template with project.smoke.yml. */
export function findKitRoot(start = process.cwd()): string {
  let cur = path.resolve(start);
  for (;;) {
    const meta = path.join(cur, "_meta");
    if (
      fs.existsSync(path.join(meta, "project.yml")) ||
      fs.existsSync(path.join(meta, "project.json")) ||
      (isBaseTemplateDir(cur) && fs.existsSync(path.join(meta, "project.smoke.yml")))
    ) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) throw new Error("Cannot find kit root (_meta/project.yml)");
    cur = parent;
  }
}

function loadYamlFile(filePath: string): ProjectConfig {
  // Optional dependency — present after npm install
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const yaml = require("js-yaml") as { load: (s: string) => unknown };
  return yaml.load(fs.readFileSync(filePath, "utf8")) as ProjectConfig;
}

function readConfigFile(kitRoot: string): ProjectConfig {
  // Prefer JSON (no runtime YAML dep). init-quality.sh keeps project.yml + project.json in sync.
  const jsonPath = path.join(kitRoot, "_meta", "project.json");
  if (fs.existsSync(jsonPath)) {
    return JSON.parse(fs.readFileSync(jsonPath, "utf8")) as ProjectConfig;
  }
  const ymlPath = path.join(kitRoot, "_meta", "project.yml");
  if (fs.existsSync(ymlPath)) {
    try {
      return loadYamlFile(ymlPath);
    } catch {
      throw new Error(
        `Found _meta/project.yml but cannot load YAML (js-yaml not installed). Run npm install.`,
      );
    }
  }
  // Base template only — smoke defaults so harness-only / annotation tests can run.
  const smokePath = path.join(kitRoot, "_meta", "project.smoke.yml");
  if (isBaseTemplateDir(kitRoot) && fs.existsSync(smokePath)) {
    try {
      return loadYamlFile(smokePath);
    } catch {
      // Fall through if YAML unavailable — provide minimal in-memory defaults.
      return {
        project: { name: "Quality Kit Base", code: "QKIT" },
        paths: { workspace_root: "..", kb_dir: "", web_dir: "", api_dir: "" },
        web: {
          service_id: "demo-web",
          http_port: 5173,
          base_path: "/",
          package_manager: "npm",
          dev_command: "npm run dev",
        },
        api: { service_id: "demo-api", http_port: 8080, route_prefix: "/api" },
        auth: {
          strategy: "cookie-fake",
          cookie_name: "access_token",
          local_storage_keys: ["ACCESS_TOKEN", "access_token", "token"],
          real: { token_env: "E2E_REAL_TOKEN", login_url: "", token_endpoint: "" },
        },
        session: {
          me: "/accounts/me",
          permissions: "/accounts/permissions",
          functions: "/accounts/functions",
          my_apps: "/accounts/my-apps",
          check_session: "/accounts/check-session",
          app_code: "QKIT",
          baseline_permission: { function_code: "QKIT.OVERVIEW.DASHBOARD", actions: ["VIEW"] },
        },
        dto: { list_items_key: "items", list_total_key: "totalCount", data_envelope: "data" },
        qc: {
          excel_glob: "qc/input/*.xlsx",
          catalog_out: "qc/catalog.json",
          results_out: "qc/results.json",
          annotation_type: "qcId",
        },
        features: { wire_web_scripts: false, wire_skills: false, e2e: true, ai_review: false },
      };
    }
  }
  throw new Error(
    `Missing _meta/project.json / project.yml. Clone Base to <project>-quality and run init-quality.sh.`,
  );
}

export function loadProjectConfig(kitRoot = findKitRoot()): ProjectConfig {
  if (cached) return cached;
  cached = readConfigFile(kitRoot);
  return cached;
}

export function webBaseURL(cfg = loadProjectConfig()): string {
  return `http://localhost:${cfg.web.http_port}`;
}

export function webDevHost(cfg = loadProjectConfig()): string {
  return `localhost:${cfg.web.http_port}`;
}

export function resolveWebDir(cfg = loadProjectConfig(), kitRoot = findKitRoot()): string {
  if (!cfg.paths.web_dir) return "";
  return path.resolve(kitRoot, cfg.paths.web_dir);
}
